"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from 'next-intl';

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

type NewAnswer = {
  text: string;
  imageUrl: string;
  isCorrect: boolean;
};

export default function QuestionManager({
  quizId,
  questions: initialQuestions,
}: {
  quizId: number;
  questions: Question[];
}) {
  const router = useRouter();
  const t = useTranslations('questionManager');
  const tQuestion = useTranslations('question');
  const tCommon = useTranslations('common');
  const tValidation = useTranslations('validation');
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [addQuestionImageUrl, setAddQuestionImageUrl] = useState<string>("");
  const [editQuestionImageUrl, setEditQuestionImageUrl] = useState<string>("");

  // State for new question answers (2-4 answers)
  const [newAnswers, setNewAnswers] = useState<NewAnswer[]>([
    { text: "", imageUrl: "", isCorrect: true },
    { text: "", imageUrl: "", isCorrect: false },
  ]);

  // State for editing question answers
  const [editAnswers, setEditAnswers] = useState<Answer[]>([]);

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
        alert(error.error || tQuestion('imageUploadError'));
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
      alert(t('networkErrorUploading'));
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
        alert(error.error || tQuestion('imageUploadError'));
        return null;
      }

      const data = await response.json();
      return data.url;
    } catch (err) {
      console.error("Error uploading image:", err);
      alert(t('networkErrorUploading'));
      return null;
    }
  }

  async function handleAddQuestion(formData: FormData) {
    const title = formData.get("title") as string;
    const questionText = formData.get("questionText") as string;
    const description = formData.get("description") as string;

    // Validate: at least one answer must have text or image
    const validAnswers = newAnswers.filter(a => a.text.trim() || a.imageUrl);
    if (!questionText) {
      alert(tValidation('questionTextRequired'));
      return;
    }
    if (validAnswers.length < 2) {
      alert(t('minAnswersValidation'));
      return;
    }
    if (!newAnswers.some(a => a.isCorrect)) {
      alert(tValidation('atLeastOneCorrect'));
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
        orderIndex: initialQuestions.length,
      }),
    });

    if (response.ok) {
      setIsAddingQuestion(false);
      setAddQuestionImageUrl("");
      setNewAnswers([
        { text: "", imageUrl: "", isCorrect: true },
        { text: "", imageUrl: "", isCorrect: false },
      ]);
      router.refresh();
    } else {
      const error = await response.json();
      alert(error.error || t('errorCreatingQuestion'));
    }
  }

  async function handleUpdateQuestion(questionId: number, formData: FormData) {
    const title = formData.get("title") as string;
    const questionText = formData.get("questionText") as string;
    const description = formData.get("description") as string;

    // Get the current question to preserve existing imageUrl if no new one is uploaded
    const currentQuestion = initialQuestions.find(q => q.id === questionId);
    const imageUrl = editQuestionImageUrl || currentQuestion?.imageUrl || null;

    // Validate: at least one answer must have text or image
    const validAnswers = editAnswers.filter(a => (a.answerText && a.answerText.trim()) || a.imageUrl);
    if (!questionText) {
      alert(tValidation('questionTextRequired'));
      return;
    }
    if (validAnswers.length < 2) {
      alert(t('minAnswersEditValidation'));
      return;
    }
    if (!editAnswers.some(a => a.isCorrect)) {
      alert(tValidation('atLeastOneCorrect'));
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
      setEditingQuestionId(null);
      setEditQuestionImageUrl("");
      setEditAnswers([]);
      router.refresh();
    } else {
      const error = await response.json();
      alert(error.error || t('errorUpdatingQuestion'));
    }
  }

  async function handleDeleteQuestion(questionId: number) {
    if (!confirm(tQuestion('deleteConfirm'))) {
      return;
    }

    const response = await fetch(`/api/questions/${questionId}`, {
      method: "DELETE",
    });

    if (response.ok) {
      router.refresh();
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-700/50 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{t('questionsCount', { count: initialQuestions.length })}</h2>
        <button
          onClick={() => setIsAddingQuestion(true)}
          className="bg-green-600 dark:bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition"
        >
          {tQuestion('addQuestion')}
        </button>
      </div>

      {/* Add Question Form */}
      {isAddingQuestion && (
        <form
          action={handleAddQuestion}
          className="mb-6 p-4 border-2 border-green-200 dark:border-green-700 rounded-lg bg-green-50 dark:bg-green-900/20"
        >
          <h3 className="font-semibold mb-4 text-gray-900 dark:text-gray-100">{t('newQuestion')}</h3>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
              {t('titleOptional')}
            </label>
            <input
              type="text"
              name="title"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 dark:text-gray-100 dark:bg-gray-700 placeholder:text-gray-500 dark:placeholder:text-gray-400"
              placeholder={t('titlePlaceholder')}
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
              {t('questionTextRequired')}
            </label>
            <input
              type="text"
              name="questionText"
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 dark:text-gray-100 dark:bg-gray-700 placeholder:text-gray-500 dark:placeholder:text-gray-400"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
              {tQuestion('description')}
            </label>
            <textarea
              name="description"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 dark:text-gray-100 dark:bg-gray-700 placeholder:text-gray-500 dark:placeholder:text-gray-400"
              placeholder={t('descriptionPlaceholder')}
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
              {t('imageOptional')}
            </label>
            <div className="flex gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    await handleImageUpload(file, false);
                  }
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 dark:text-gray-100 dark:bg-gray-700"
                disabled={uploadingImage}
              />
              {uploadingImage && (
                <span className="text-gray-600 dark:text-gray-400 py-2">{t('uploading')}</span>
              )}
            </div>
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
              <div className="flex gap-2">
                {newAnswers.length < 4 && (
                  <button
                    type="button"
                    onClick={() => setNewAnswers([...newAnswers, { text: "", imageUrl: "", isCorrect: false }])}
                    className="text-sm bg-green-500 dark:bg-green-600 text-white px-3 py-1 rounded hover:bg-green-600 dark:hover:bg-green-700 transition"
                  >
                    {t('addAnswerButton')}
                  </button>
                )}
              </div>
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
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 dark:text-gray-100 dark:bg-gray-600 placeholder:text-gray-500 dark:placeholder:text-gray-400"
                  />
                  {newAnswers.length > 2 && (
                    <button
                      type="button"
                      onClick={() => {
                        const updated = newAnswers.filter((_, idx) => idx !== i);
                        // If removing the correct answer, make the first one correct
                        if (answer.isCorrect && updated.length > 0) {
                          updated[0].isCorrect = true;
                        }
                        setNewAnswers(updated);
                      }}
                      className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 px-2"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div className="ml-6">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const url = await handleAnswerImageUpload(file);
                        if (url) {
                          const updated = [...newAnswers];
                          updated[i].imageUrl = url;
                          setNewAnswers(updated);
                        }
                      }
                    }}
                    className="text-sm px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-gray-100 dark:bg-gray-600"
                  />
                  {answer.imageUrl && (
                    <div className="mt-2">
                      <img src={answer.imageUrl} alt={t('answerImageAlt')} className="max-w-xs rounded border border-gray-300 dark:border-gray-600" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-green-600 dark:bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition"
            >
              {t('saveQuestion')}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAddingQuestion(false);
                setNewAnswers([
                  { text: "", imageUrl: "", isCorrect: true },
                  { text: "", imageUrl: "", isCorrect: false },
                ]);
                setAddQuestionImageUrl("");
              }}
              className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition"
            >
              {tCommon('cancel')}
            </button>
          </div>
        </form>
      )}

      {/* Questions List */}
      {initialQuestions.length === 0 ? (
        <p className="text-gray-700 dark:text-gray-300 text-center py-8">
          {t('noQuestions')}
        </p>
      ) : (
        <div className="space-y-4">
          {initialQuestions.map((question, index) => (
            <div key={question.id} className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-700">
              {editingQuestionId === question.id ? (
                <form
                  action={(formData) => handleUpdateQuestion(question.id, formData)}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
                      {t('titleOptional')}
                    </label>
                    <input
                      type="text"
                      name="title"
                      defaultValue={question.title || ""}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100 dark:bg-gray-600 placeholder:text-gray-500 dark:placeholder:text-gray-400"
                      placeholder={t('titlePlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
                      {t('questionTextRequired')}
                    </label>
                    <input
                      type="text"
                      name="questionText"
                      defaultValue={question.questionText}
                      required
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100 dark:bg-gray-600 placeholder:text-gray-500 dark:placeholder:text-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
                      {tQuestion('description')}
                    </label>
                    <textarea
                      name="description"
                      defaultValue={question.description || ""}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100 dark:bg-gray-600 placeholder:text-gray-500 dark:placeholder:text-gray-400"
                      placeholder={t('descriptionPlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
                      {t('imageOptional')}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            await handleImageUpload(file, true);
                          }
                        }}
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100 dark:bg-gray-600"
                        disabled={uploadingImage}
                      />
                      {uploadingImage && (
                        <span className="text-gray-600 dark:text-gray-400 py-2">{t('uploading')}</span>
                      )}
                    </div>
                    {(editQuestionImageUrl || question.imageUrl) && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        {t('currentImage', { url: editQuestionImageUrl || question.imageUrl || '' })}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">
                        {t('answersRequired')}
                      </label>
                      <div className="flex gap-2">
                        {editAnswers.length < 4 && (
                          <button
                            type="button"
                            onClick={() => setEditAnswers([...editAnswers, {
                              id: -Date.now(), // Temporary negative ID for new answers
                              answerText: "",
                              imageUrl: null,
                              isCorrect: false,
                              orderIndex: editAnswers.length
                            }])}
                            className="text-sm bg-blue-500 dark:bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-600 dark:hover:bg-blue-700 transition"
                          >
                            {t('addAnswerButton')}
                          </button>
                        )}
                      </div>
                    </div>
                    {editAnswers.map((answer, i) => (
                      <div key={answer.id} className="mb-3 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600">
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
                            className="w-4 h-4 text-blue-600"
                          />
                          <input
                            type="text"
                            value={answer.answerText || ""}
                            onChange={(e) => {
                              const updated = [...editAnswers];
                              updated[i].answerText = e.target.value;
                              setEditAnswers(updated);
                            }}
                            placeholder={t('answerPlaceholder', { number: i + 1 })}
                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100 dark:bg-gray-500 placeholder:text-gray-500 dark:placeholder:text-gray-400"
                          />
                          {editAnswers.length > 2 && (
                            <button
                              type="button"
                              onClick={() => {
                                const updated = editAnswers.filter((_, idx) => idx !== i);
                                // If removing the correct answer, make the first one correct
                                if (answer.isCorrect && updated.length > 0) {
                                  updated[0].isCorrect = true;
                                }
                                setEditAnswers(updated);
                              }}
                              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 px-2"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                        <div className="ml-6">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const url = await handleAnswerImageUpload(file);
                                if (url) {
                                  const updated = [...editAnswers];
                                  updated[i].imageUrl = url;
                                  setEditAnswers(updated);
                                }
                              }
                            }}
                            className="text-sm px-2 py-1 border border-gray-300 dark:border-gray-500 rounded text-gray-900 dark:text-gray-100 dark:bg-gray-500"
                          />
                          {answer.imageUrl && (
                            <div className="mt-2">
                              <img src={answer.imageUrl} alt={t('answerImageAlt')} className="max-w-xs rounded border border-gray-300 dark:border-gray-500" />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="bg-blue-600 dark:bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition"
                    >
                      {tCommon('save')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingQuestionId(null);
                        setEditAnswers([]);
                        setEditQuestionImageUrl("");
                      }}
                      className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition"
                    >
                      {tCommon('cancel')}
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      {question.title && (
                        <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                          {question.title}
                        </div>
                      )}
                      <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                        {index + 1}. {question.questionText}
                      </h3>
                      {question.description && (
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                          {question.description}
                        </p>
                      )}
                      {question.imageUrl && (
                        <img
                          src={question.imageUrl}
                          alt={t('questionImageAlt')}
                          className="mt-3 max-w-md rounded-lg border border-gray-300 dark:border-gray-600"
                        />
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => {
                          setEditingQuestionId(question.id);
                          setEditAnswers(question.answers);
                        }}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium"
                      >
                        {tCommon('edit')}
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(question.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm font-medium"
                      >
                        {tCommon('delete')}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {question.answers.map((answer, i) => (
                      <div
                        key={answer.id}
                        className={`px-3 py-2 rounded ${
                          answer.isCorrect
                            ? "bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 text-green-900 dark:text-green-100"
                            : "bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 text-gray-900 dark:text-gray-100"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            {String.fromCharCode(65 + i)}. {answer.answerText}
                            {answer.isCorrect && (
                              <span className="ml-2 text-green-700 dark:text-green-400 font-semibold">{t('correctMark')}</span>
                            )}
                          </div>
                        </div>
                        {answer.imageUrl && (
                          <img
                            src={answer.imageUrl}
                            alt={t('answerImageAlt')}
                            className="mt-2 max-w-xs rounded border border-gray-300 dark:border-gray-500"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
