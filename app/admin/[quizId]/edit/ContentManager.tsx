"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { useConfirm } from '@/app/components/ConfirmDialog';
import { Button } from '@/app/components/Button';
import { Card } from '@/app/components/Card';
import { FormInput } from '@/app/components/FormInput';
import MarkdownPreview from '@/app/components/MarkdownPreview';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type Answer = {
  id: number;
  answerText: string | null;
  imageUrl: string | null;
  isCorrect: boolean;
  orderIndex: number;
};

type Question = {
  id: number;
  title?: string | null;
  questionText: string;
  description?: string | null;
  imageUrl?: string | null;
  orderIndex: number;
  answers: Answer[];
};

type Page = {
  id: number;
  title: string;
  content: string;
  orderIndex: number;
};

type ContentItem =
  | { type: 'question'; data: Question }
  | { type: 'page'; data: Page };

type NewAnswer = {
  text: string;
  imageUrl: string;
  isCorrect: boolean;
};

function SortableItem({ item, children }: { item: ContentItem; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `${item.type}-${item.data.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div className="flex items-start gap-2">
        <button
          {...listeners}
          className="mt-4 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 flex-shrink-0"
          aria-label="Drag to reorder"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function ContentManager({
  quizId,
  questions: initialQuestions,
  pages: initialPages,
}: {
  quizId: number;
  questions: Question[];
  pages: Page[];
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const t = useTranslations('questionManager');
  const tPage = useTranslations('pageManager');
  const tQuestion = useTranslations('question');
  const tCommon = useTranslations('common');
  const tValidation = useTranslations('validation');

  // Create unified content array
  const createContentArray = (questions: Question[], pages: Page[]): ContentItem[] => {
    const content: ContentItem[] = [
      ...questions.map(q => ({ type: 'question' as const, data: q })),
      ...pages.map(p => ({ type: 'page' as const, data: p })),
    ];
    return content.sort((a, b) => a.data.orderIndex - b.data.orderIndex);
  };

  const [contentItems, setContentItems] = useState<ContentItem[]>(() =>
    createContentArray(initialQuestions, initialPages)
  );

  const [contentType, setContentType] = useState<'question' | 'page'>('question');
  const [isAddingContent, setIsAddingContent] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);
  const [editingPageId, setEditingPageId] = useState<number | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [addQuestionImageUrl, setAddQuestionImageUrl] = useState<string>("");
  const [editQuestionImageUrl, setEditQuestionImageUrl] = useState<string>("");
  const [markdownPreview, setMarkdownPreview] = useState(false);
  const [pageBody, setPageBody] = useState("");
  const [editPageBody, setEditPageBody] = useState("");

  // State for new question answers (2-4 answers)
  const [newAnswers, setNewAnswers] = useState<NewAnswer[]>([
    { text: "", imageUrl: "", isCorrect: true },
    { text: "", imageUrl: "", isCorrect: false },
  ]);

  // State for editing question answers
  const [editAnswers, setEditAnswers] = useState<Answer[]>([]);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  async function handleImageUpload(file: File, isEdit: boolean = false): Promise<string | null> {
    if (!file) return null;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || tQuestion('imageUploadError'));
        return null;
      }

      const data = await response.json();
      if (isEdit) {
        setEditQuestionImageUrl(data.url);
      } else {
        setAddQuestionImageUrl(data.url);
      }
      return data.url;
    } catch (err) {
      console.error("Error uploading image:", err);
      toast.error(t('networkErrorUploading'));
      return null;
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleAnswerImageUpload(file: File): Promise<string | null> {
    if (!file) return null;

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || tQuestion('imageUploadError'));
        return null;
      }

      const data = await response.json();
      return data.url;
    } catch (err) {
      console.error("Error uploading image:", err);
      toast.error(t('networkErrorUploading'));
      return null;
    }
  }

  async function handleMarkdownImageUpload(file: File): Promise<string | null> {
    if (!file) return null;

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || tPage('imageUploadError'));
        return null;
      }

      const data = await response.json();
      return data.url;
    } catch (err) {
      console.error("Error uploading image:", err);
      toast.error(tPage('networkErrorUploading'));
      return null;
    }
  }

  function insertMarkdownImage(url: string, isEdit: boolean = false) {
    const markdown = `![Image](${url})`;
    if (isEdit) {
      setEditPageBody(prev => prev + '\n' + markdown + '\n');
    } else {
      setPageBody(prev => prev + '\n' + markdown + '\n');
    }
  }

  async function handleAddQuestion(formData: FormData) {
    const title = formData.get("title") as string;
    const questionText = formData.get("questionText") as string;
    const description = formData.get("description") as string;

    // Validate
    const validAnswers = newAnswers.filter(a => a.text.trim() || a.imageUrl);
    if (!questionText) {
      toast.error(tValidation('questionTextRequired'));
      return;
    }
    if (validAnswers.length < 2) {
      toast.error(t('minAnswersValidation'));
      return;
    }
    if (!newAnswers.some(a => a.isCorrect)) {
      toast.error(tValidation('atLeastOneCorrect'));
      return;
    }

    const response = await fetch("/api/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quizId,
        title: title || null,
        questionText,
        description: description || null,
        imageUrl: addQuestionImageUrl || null,
        answers: validAnswers.map(a => ({
          text: a.text || null,
          imageUrl: a.imageUrl || null,
          isCorrect: a.isCorrect,
        })),
        orderIndex: contentItems.length,
      }),
    });

    if (response.ok) {
      const newQuestion = await response.json();
      setContentItems(prev => [...prev, { type: 'question', data: newQuestion }]);
      setIsAddingContent(false);
      setAddQuestionImageUrl("");
      setNewAnswers([
        { text: "", imageUrl: "", isCorrect: true },
        { text: "", imageUrl: "", isCorrect: false },
      ]);
      toast.success(t('questionCreated'));
      router.refresh();
    } else {
      const error = await response.json();
      toast.error(error.error || t('errorCreatingQuestion'));
    }
  }

  async function handleAddPage(formData: FormData) {
    const title = formData.get("title") as string;

    if (!title || !pageBody.trim()) {
      toast.error(tPage('titleAndBodyRequired'));
      return;
    }

    const response = await fetch("/api/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quizId,
        title,
        content: pageBody,
        orderIndex: contentItems.length,
      }),
    });

    if (response.ok) {
      const newPage = await response.json();
      setContentItems(prev => [...prev, { type: 'page', data: newPage }]);
      setIsAddingContent(false);
      setPageBody("");
      setMarkdownPreview(false);
      toast.success(tPage('pageCreated'));
      router.refresh();
    } else {
      const error = await response.json();
      toast.error(error.error || tPage('errorCreatingPage'));
    }
  }

  async function handleUpdateQuestion(questionId: number, formData: FormData) {
    const title = formData.get("title") as string;
    const questionText = formData.get("questionText") as string;
    const description = formData.get("description") as string;

    const currentQuestion = contentItems.find(
      item => item.type === 'question' && item.data.id === questionId
    )?.data as Question;
    const imageUrl = editQuestionImageUrl || currentQuestion?.imageUrl || null;

    const validAnswers = editAnswers.filter(a => (a.answerText && a.answerText.trim()) || a.imageUrl);
    if (!questionText) {
      toast.error(tValidation('questionTextRequired'));
      return;
    }
    if (validAnswers.length < 2) {
      toast.error(t('minAnswersEditValidation'));
      return;
    }
    if (!editAnswers.some(a => a.isCorrect)) {
      toast.error(tValidation('atLeastOneCorrect'));
      return;
    }

    const response = await fetch(`/api/questions/${questionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title || null,
        questionText,
        description: description || null,
        imageUrl,
        answers: validAnswers.map(a => ({
          id: a.id,
          text: a.answerText || null,
          imageUrl: a.imageUrl || null,
          isCorrect: a.isCorrect,
        })),
      }),
    });

    if (response.ok) {
      const updatedQuestion = await response.json();
      setContentItems(prev => prev.map(item =>
        item.type === 'question' && item.data.id === questionId
          ? { type: 'question', data: updatedQuestion }
          : item
      ));
      setEditingQuestionId(null);
      setEditQuestionImageUrl("");
      setEditAnswers([]);
      toast.success(t('questionUpdated'));
      router.refresh();
    } else {
      const error = await response.json();
      toast.error(error.error || t('errorUpdatingQuestion'));
    }
  }

  async function handleUpdatePage(pageId: number, formData: FormData) {
    const title = formData.get("pageTitle") as string;

    if (!title || !editPageBody.trim()) {
      toast.error(tPage('titleAndBodyRequired'));
      return;
    }

    const response = await fetch(`/api/pages/${pageId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        content: editPageBody,
      }),
    });

    if (response.ok) {
      const updatedPage = await response.json();
      setContentItems(prev => prev.map(item =>
        item.type === 'page' && item.data.id === pageId
          ? { type: 'page', data: updatedPage }
          : item
      ));
      setEditingPageId(null);
      setEditPageBody("");
      toast.success(tPage('pageUpdated'));
      router.refresh();
    } else {
      const error = await response.json();
      toast.error(error.error || tPage('errorUpdatingPage'));
    }
  }

  async function handleDeleteQuestion(questionId: number) {
    const confirmed = await confirm({
      title: tQuestion('deleteQuestion'),
      message: tQuestion('deleteConfirm'),
      confirmText: tCommon('delete'),
      cancelText: tCommon('cancel'),
      confirmColor: 'red',
    });

    if (!confirmed) return;

    const response = await fetch(`/api/questions/${questionId}`, {
      method: "DELETE",
    });

    if (response.ok) {
      setContentItems(prev => prev.filter(item =>
        !(item.type === 'question' && item.data.id === questionId)
      ));
      toast.success(t('questionDeleted'));
      router.refresh();
    } else {
      toast.error(t('errorDeletingQuestion'));
    }
  }

  async function handleDeletePage(pageId: number) {
    const confirmed = await confirm({
      title: tPage('deletePage'),
      message: tPage('deleteConfirm'),
      confirmText: tCommon('delete'),
      cancelText: tCommon('cancel'),
      confirmColor: 'red',
    });

    if (!confirmed) return;

    const response = await fetch(`/api/pages/${pageId}`, {
      method: "DELETE",
    });

    if (response.ok) {
      setContentItems(prev => prev.filter(item =>
        !(item.type === 'page' && item.data.id === pageId)
      ));
      toast.success(tPage('pageDeleted'));
      router.refresh();
    } else {
      toast.error(tPage('errorDeletingPage'));
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = contentItems.findIndex(item => `${item.type}-${item.data.id}` === active.id);
    const newIndex = contentItems.findIndex(item => `${item.type}-${item.data.id}` === over.id);

    const reorderedItems = arrayMove(contentItems, oldIndex, newIndex);
    setContentItems(reorderedItems);

    // Update order indices in backend
    const updates = reorderedItems.map((item, index) => ({
      type: item.type,
      id: item.data.id,
      orderIndex: index,
    }));

    const response = await fetch("/api/content/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quizId, items: updates }),
    });

    if (response.ok) {
      toast.success(tCommon('reordered'));
      router.refresh();
    } else {
      toast.error(tCommon('errorReordering'));
      setContentItems(contentItems); // Revert on error
    }
  }

  const handleAddContent = contentType === 'question' ? handleAddQuestion : handleAddPage;

  return (
    <Card variant="form" className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100">
          {t('contentCount', { count: contentItems.length })}
        </h2>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button
            onClick={() => {
              setContentType('question');
              setIsAddingContent(true);
            }}
            variant="primary"
            size="md"
            className="w-full sm:w-auto"
          >
            {tQuestion('addQuestion')}
          </Button>
          <button
            onClick={() => {
              setContentType('page');
              setIsAddingContent(true);
            }}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition w-full sm:w-auto"
          >
            {tPage('addPage')}
          </button>
        </div>
      </div>

      {/* Add Content Form */}
      {isAddingContent && contentType === 'question' && (
        <form
          action={handleAddQuestion}
          className="mb-6 p-4 border-2 border-green-200 dark:border-green-700 rounded-lg bg-green-50 dark:bg-green-900/20"
        >
          <h3 className="font-semibold mb-4 text-gray-900 dark:text-gray-100">{t('newQuestion')}</h3>
          <FormInput
            type="text"
            name="title"
            label={t('titleOptional')}
            placeholder={t('titlePlaceholder')}
            className="mb-4"
          />
          <FormInput
            type="text"
            name="questionText"
            label={t('questionTextRequired')}
            required
            className="mb-4"
          />
          <FormInput
            as="textarea"
            name="description"
            label={tQuestion('description')}
            placeholder={t('descriptionPlaceholder')}
            rows={3}
            className="mb-4"
          />
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
              {t('imageOptional')}
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) await handleImageUpload(file, false);
              }}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white text-gray-900 dark:bg-gray-700 dark:text-gray-100"
              disabled={uploadingImage}
            />
            {addQuestionImageUrl && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                {t('imageUploaded', { url: addQuestionImageUrl })}
              </p>
            )}
          </div>

          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">
                {t('answersRequired')}
              </label>
              {newAnswers.length < 4 && (
                <Button
                  type="button"
                  onClick={() => setNewAnswers([...newAnswers, { text: "", imageUrl: "", isCorrect: false }])}
                  variant="success"
                  size="sm"
                >
                  {t('addAnswerButton')}
                </Button>
              )}
            </div>
            {newAnswers.map((answer, i) => (
              <div key={i} className="mb-3 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="radio"
                    checked={answer.isCorrect}
                    onChange={() => {
                      setNewAnswers(newAnswers.map((a, idx) => ({
                        ...a,
                        isCorrect: idx === i
                      })));
                    }}
                    className="w-4 h-4 text-green-600"
                  />
                  <input
                    type="text"
                    value={answer.text}
                    onChange={(e) => {
                      const updated = [...newAnswers];
                      updated[i].text = e.target.value;
                      setNewAnswers(updated);
                    }}
                    placeholder={t('answerPlaceholder', { number: i + 1 })}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white text-gray-900 dark:bg-gray-600 dark:text-gray-100"
                  />
                  {newAnswers.length > 2 && (
                    <button
                      type="button"
                      onClick={() => {
                        const updated = newAnswers.filter((_, idx) => idx !== i);
                        if (answer.isCorrect && updated.length > 0) {
                          updated[0].isCorrect = true;
                        }
                        setNewAnswers(updated);
                      }}
                      className="text-red-600 dark:text-red-400 px-2"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button type="submit" variant="success" size="md">
              {t('saveQuestion')}
            </Button>
            <Button
              type="button"
              onClick={() => {
                setIsAddingContent(false);
                setNewAnswers([
                  { text: "", imageUrl: "", isCorrect: true },
                  { text: "", imageUrl: "", isCorrect: false },
                ]);
                setAddQuestionImageUrl("");
              }}
              variant="secondary"
              size="md"
            >
              {tCommon('cancel')}
            </Button>
          </div>
        </form>
      )}

      {isAddingContent && contentType === 'page' && (
        <form
          action={handleAddPage}
          className="mb-6 p-4 border-2 border-green-200 dark:border-green-700 rounded-lg bg-green-50 dark:bg-green-900/20"
        >
          <h3 className="font-semibold mb-4 text-gray-900 dark:text-gray-100">{tPage('newPage')}</h3>
          <FormInput
            type="text"
            name="title"
            label={tPage('pageTitle')}
            required
            className="mb-4"
          />

          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">
                {tPage('pageBody')}
              </label>
              <div className="flex gap-2">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const url = await handleMarkdownImageUpload(file);
                        if (url) insertMarkdownImage(url, false);
                      }
                    }}
                  />
                  <span className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                    {tPage('uploadImage')}
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => setMarkdownPreview(!markdownPreview)}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {markdownPreview ? tPage('editMode') : tPage('preview')}
                </button>
              </div>
            </div>
            {!markdownPreview ? (
              <textarea
                value={pageBody}
                onChange={(e) => setPageBody(e.target.value)}
                rows={10}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white text-gray-900 dark:bg-gray-700 dark:text-gray-100 font-mono text-sm"
                placeholder={tPage('markdownPlaceholder')}
              />
            ) : (
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-700 min-h-[200px]">
                <MarkdownPreview content={pageBody} />
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button type="submit" variant="success" size="md">
              {tPage('savePage')}
            </Button>
            <Button
              type="button"
              onClick={() => {
                setIsAddingContent(false);
                setPageBody("");
                setMarkdownPreview(false);
              }}
              variant="secondary"
              size="md"
            >
              {tCommon('cancel')}
            </Button>
          </div>
        </form>
      )}

      {/* Content List with Drag and Drop */}
      {contentItems.length === 0 ? (
        <p className="text-gray-700 dark:text-gray-300 text-center py-8">
          {t('noContent')}
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={contentItems.map(item => `${item.type}-${item.data.id}`)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {contentItems.map((item, index) => (
                <SortableItem key={`${item.type}-${item.data.id}`} item={item}>
                  <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-gray-100 dark:bg-gray-600">
                    {item.type === 'question' ? (
                      <div>
                        {editingQuestionId === item.data.id ? (
                          <form
                            action={(formData) => handleUpdateQuestion(item.data.id, formData)}
                            className="p-4 border-2 border-blue-200 dark:border-blue-700 rounded-lg bg-blue-50 dark:bg-blue-900/20"
                          >
                            <h3 className="font-semibold mb-4 text-gray-900 dark:text-gray-100">{t('editQuestion')}</h3>
                            <FormInput
                              type="text"
                              name="title"
                              label={t('titleOptional')}
                              placeholder={t('titlePlaceholder')}
                              defaultValue={(item.data as Question).title || ''}
                              className="mb-4"
                            />
                            <FormInput
                              type="text"
                              name="questionText"
                              label={t('questionTextRequired')}
                              required
                              defaultValue={(item.data as Question).questionText}
                              className="mb-4"
                            />
                            <FormInput
                              as="textarea"
                              name="description"
                              label={tQuestion('description')}
                              placeholder={t('descriptionPlaceholder')}
                              defaultValue={(item.data as Question).description || ''}
                              rows={3}
                              className="mb-4"
                            />
                            <div className="mb-4">
                              <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
                                {t('imageOptional')}
                              </label>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const url = await handleImageUpload(file, true);
                                    if (url) setEditQuestionImageUrl(url);
                                  }
                                }}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white text-gray-900 dark:bg-gray-700 dark:text-gray-100"
                                disabled={uploadingImage}
                              />
                              {(editQuestionImageUrl || (item.data as Question).imageUrl) && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                                  {t('imageUploaded', { url: editQuestionImageUrl || (item.data as Question).imageUrl || '' })}
                                </p>
                              )}
                            </div>

                            <div className="mb-4">
                              <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">
                                  {t('answersRequired')}
                                </label>
                                {editAnswers.length < 4 && (
                                  <Button
                                    type="button"
                                    onClick={() => setEditAnswers([...editAnswers, { id: Date.now(), answerText: "", imageUrl: "", isCorrect: false, orderIndex: editAnswers.length }])}
                                    variant="success"
                                    size="sm"
                                  >
                                    {t('addAnswerButton')}
                                  </Button>
                                )}
                              </div>
                              {editAnswers.map((answer, i) => (
                                <div key={answer.id} className="mb-3 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
                                  <div className="flex items-center gap-2 mb-2">
                                    <input
                                      type="radio"
                                      checked={answer.isCorrect}
                                      onChange={() => {
                                        setEditAnswers(editAnswers.map((a, idx) => ({
                                          ...a,
                                          isCorrect: idx === i
                                        })));
                                      }}
                                      className="w-4 h-4 text-green-600"
                                    />
                                    <input
                                      type="text"
                                      value={answer.answerText || ''}
                                      onChange={(e) => {
                                        const updated = [...editAnswers];
                                        updated[i].answerText = e.target.value;
                                        setEditAnswers(updated);
                                      }}
                                      placeholder={t('answerPlaceholder', { number: i + 1 })}
                                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white text-gray-900 dark:bg-gray-600 dark:text-gray-100"
                                    />
                                    {editAnswers.length > 2 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updated = editAnswers.filter((_, idx) => idx !== i);
                                          if (answer.isCorrect && updated.length > 0) {
                                            updated[0].isCorrect = true;
                                          }
                                          setEditAnswers(updated);
                                        }}
                                        className="text-red-600 dark:text-red-400 px-2"
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="flex gap-2">
                              <Button type="submit" variant="success" size="md">
                                {t('saveQuestion')}
                              </Button>
                              <Button
                                type="button"
                                onClick={() => {
                                  setEditingQuestionId(null);
                                  setEditQuestionImageUrl("");
                                  setEditAnswers([]);
                                }}
                                variant="secondary"
                                size="md"
                              >
                                {tCommon('cancel')}
                              </Button>
                            </div>
                          </form>
                        ) : (
                          <>
                            <div className="flex justify-between items-start gap-3 mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded">
                                    {tQuestion('question')}
                                  </span>
                                  {item.data.title && (
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                      {item.data.title}
                                    </span>
                                  )}
                                </div>
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                                  {index + 1}. {(item.data as Question).questionText}
                                </h3>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    const question = item.data as Question;
                                    setEditingQuestionId(item.data.id);
                                    setEditAnswers(question.answers);
                                    setEditQuestionImageUrl(question.imageUrl || "");
                                  }}
                                  className="text-blue-600 dark:text-blue-400 text-sm"
                                >
                                  {tCommon('edit')}
                                </button>
                                <button
                                  onClick={() => handleDeleteQuestion(item.data.id)}
                                  className="text-red-600 dark:text-red-400 text-sm"
                                >
                                  {tCommon('delete')}
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <div>
                        {editingPageId === item.data.id ? (
                          <form
                            action={(formData) => handleUpdatePage(item.data.id, formData)}
                            className="p-4 border-2 border-purple-200 dark:border-purple-700 rounded-lg bg-purple-50 dark:bg-purple-900/20"
                          >
                            <h3 className="font-semibold mb-4 text-gray-900 dark:text-gray-100">{tPage('editPage')}</h3>
                            <FormInput
                              type="text"
                              name="pageTitle"
                              label={tPage('pageTitle')}
                              required
                              defaultValue={(item.data as Page).title}
                              className="mb-4"
                            />

                            <div className="mb-4">
                              <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">
                                  {tPage('pageBody')}
                                </label>
                                <div className="flex gap-2">
                                  <label className="cursor-pointer">
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          const url = await handleMarkdownImageUpload(file);
                                          if (url) insertMarkdownImage(url, true);
                                        }
                                      }}
                                    />
                                    <span className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                                      {tPage('uploadImage')}
                                    </span>
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => setMarkdownPreview(!markdownPreview)}
                                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                                  >
                                    {markdownPreview ? tPage('editMode') : tPage('preview')}
                                  </button>
                                </div>
                              </div>
                              {!markdownPreview ? (
                                <textarea
                                  value={editPageBody}
                                  onChange={(e) => setEditPageBody(e.target.value)}
                                  rows={10}
                                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white text-gray-900 dark:bg-gray-700 dark:text-gray-100 font-mono text-sm"
                                  placeholder={tPage('markdownPlaceholder')}
                                />
                              ) : (
                                <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-700 min-h-[200px]">
                                  <MarkdownPreview content={editPageBody} />
                                </div>
                              )}
                            </div>

                            <div className="flex gap-2">
                              <Button type="submit" variant="success" size="md">
                                {tPage('savePage')}
                              </Button>
                              <Button
                                type="button"
                                onClick={() => {
                                  setEditingPageId(null);
                                  setEditPageBody("");
                                  setMarkdownPreview(false);
                                }}
                                variant="secondary"
                                size="md"
                              >
                                {tCommon('cancel')}
                              </Button>
                            </div>
                          </form>
                        ) : (
                          <>
                            <div className="flex justify-between items-start gap-3 mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="px-2 py-1 text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded">
                                    {tPage('page')}
                                  </span>
                                </div>
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                                  {index + 1}. {(item.data as Page).title}
                                </h3>
                                <div className="mt-2 text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                                  {(item.data as Page).content.substring(0, 100)}...
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setEditingPageId(item.data.id);
                                    setEditPageBody((item.data as Page).content);
                                  }}
                                  className="text-blue-600 dark:text-blue-400 text-sm"
                                >
                                  {tCommon('edit')}
                                </button>
                                <button
                                  onClick={() => handleDeletePage(item.data.id)}
                                  className="text-red-600 dark:text-red-400 text-sm"
                                >
                                  {tCommon('delete')}
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </SortableItem>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </Card>
  );
}
