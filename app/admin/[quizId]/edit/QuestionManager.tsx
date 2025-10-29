"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Answer = {
  id: number;
  answerText: string;
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

export default function QuestionManager({
  quizId,
  questions: initialQuestions,
}: {
  quizId: number;
  questions: Question[];
}) {
  const router = useRouter();
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [addQuestionImageUrl, setAddQuestionImageUrl] = useState<string>("");
  const [editQuestionImageUrl, setEditQuestionImageUrl] = useState<string>("");

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
        alert(error.error || "Fehler beim Hochladen des Bildes");
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
      alert("Netzwerkfehler beim Hochladen");
      return null;
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleAddQuestion(formData: FormData) {
    const title = formData.get("title") as string;
    const questionText = formData.get("questionText") as string;
    const description = formData.get("description") as string;
    const answers = [
      { text: formData.get("answer0") as string, isCorrect: formData.get("correct") === "0" },
      { text: formData.get("answer1") as string, isCorrect: formData.get("correct") === "1" },
      { text: formData.get("answer2") as string, isCorrect: formData.get("correct") === "2" },
      { text: formData.get("answer3") as string, isCorrect: formData.get("correct") === "3" },
    ];

    if (!questionText || answers.some((a) => !a.text)) {
      alert("Bitte fülle alle Felder aus");
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
        answers,
        orderIndex: initialQuestions.length,
      }),
    });

    if (response.ok) {
      setIsAddingQuestion(false);
      setAddQuestionImageUrl("");
      router.refresh();
    }
  }

  async function handleUpdateQuestion(questionId: number, formData: FormData) {
    const title = formData.get("title") as string;
    const questionText = formData.get("questionText") as string;
    const description = formData.get("description") as string;

    // Get the current question to preserve existing imageUrl if no new one is uploaded
    const currentQuestion = initialQuestions.find(q => q.id === questionId);
    const imageUrl = editQuestionImageUrl || currentQuestion?.imageUrl || null;

    const answers = [
      {
        id: parseInt(formData.get("answerId0") as string),
        text: formData.get("answer0") as string,
        isCorrect: formData.get("correct") === "0",
      },
      {
        id: parseInt(formData.get("answerId1") as string),
        text: formData.get("answer1") as string,
        isCorrect: formData.get("correct") === "1",
      },
      {
        id: parseInt(formData.get("answerId2") as string),
        text: formData.get("answer2") as string,
        isCorrect: formData.get("correct") === "2",
      },
      {
        id: parseInt(formData.get("answerId3") as string),
        text: formData.get("answer3") as string,
        isCorrect: formData.get("correct") === "3",
      },
    ];

    if (!questionText || answers.some((a) => !a.text)) {
      alert("Bitte fülle alle Felder aus");
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
        answers,
      }),
    });

    if (response.ok) {
      setEditingQuestionId(null);
      setEditQuestionImageUrl("");
      router.refresh();
    }
  }

  async function handleDeleteQuestion(questionId: number) {
    if (!confirm("Bist du sicher, dass du diese Frage löschen möchtest?")) {
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
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Fragen ({initialQuestions.length})</h2>
        <button
          onClick={() => setIsAddingQuestion(true)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
        >
          Frage hinzufügen
        </button>
      </div>

      {/* Add Question Form */}
      {isAddingQuestion && (
        <form
          action={handleAddQuestion}
          className="mb-6 p-4 border-2 border-green-200 rounded-lg bg-green-50"
        >
          <h3 className="font-semibold mb-4 text-gray-900">Neue Frage</h3>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-800 mb-2">
              Titel (optional)
            </label>
            <input
              type="text"
              name="title"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 placeholder:text-gray-500"
              placeholder="z.B. Frage 1"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-800 mb-2">
              Fragetext *
            </label>
            <input
              type="text"
              name="questionText"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 placeholder:text-gray-500"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-800 mb-2">
              Beschreibung (optional)
            </label>
            <textarea
              name="description"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 placeholder:text-gray-500"
              placeholder="Zusätzliche Informationen oder Kontext..."
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-800 mb-2">
              Bild (optional)
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
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
                disabled={uploadingImage}
              />
              {uploadingImage && (
                <span className="text-gray-600 py-2">Lädt hoch...</span>
              )}
            </div>
            {addQuestionImageUrl && (
              <p className="text-sm text-gray-600 mt-2">
                Bild hochgeladen: {addQuestionImageUrl}
              </p>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-800 mb-2">
              Antworten (wähle die richtige) *
            </label>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <input
                  type="radio"
                  name="correct"
                  value={i}
                  required
                  className="w-4 h-4 text-green-600"
                />
                <input
                  type="text"
                  name={`answer${i}`}
                  required
                  placeholder={`Antwort ${i + 1}`}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 placeholder:text-gray-500"
                />
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
            >
              Frage speichern
            </button>
            <button
              type="button"
              onClick={() => setIsAddingQuestion(false)}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition"
            >
              Abbrechen
            </button>
          </div>
        </form>
      )}

      {/* Questions List */}
      {initialQuestions.length === 0 ? (
        <p className="text-gray-700 text-center py-8">
          Noch keine Fragen. Füge deine erste Frage hinzu!
        </p>
      ) : (
        <div className="space-y-4">
          {initialQuestions.map((question, index) => (
            <div key={question.id} className="border rounded-lg p-4">
              {editingQuestionId === question.id ? (
                <form
                  action={(formData) => handleUpdateQuestion(question.id, formData)}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-2">
                      Titel (optional)
                    </label>
                    <input
                      type="text"
                      name="title"
                      defaultValue={question.title || ""}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder:text-gray-500"
                      placeholder="z.B. Frage 1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-2">
                      Fragetext *
                    </label>
                    <input
                      type="text"
                      name="questionText"
                      defaultValue={question.questionText}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder:text-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-2">
                      Beschreibung (optional)
                    </label>
                    <textarea
                      name="description"
                      defaultValue={question.description || ""}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder:text-gray-500"
                      placeholder="Zusätzliche Informationen oder Kontext..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-2">
                      Bild (optional)
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
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                        disabled={uploadingImage}
                      />
                      {uploadingImage && (
                        <span className="text-gray-600 py-2">Lädt hoch...</span>
                      )}
                    </div>
                    {(editQuestionImageUrl || question.imageUrl) && (
                      <p className="text-sm text-gray-600 mt-2">
                        Aktuelles Bild: {editQuestionImageUrl || question.imageUrl}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-2">
                      Antworten (wähle die richtige) *
                    </label>
                    {question.answers.map((answer, i) => (
                      <div key={answer.id} className="flex items-center gap-2 mb-2">
                        <input
                          type="hidden"
                          name={`answerId${i}`}
                          value={answer.id}
                        />
                        <input
                          type="radio"
                          name="correct"
                          value={i}
                          defaultChecked={answer.isCorrect}
                          required
                          className="w-4 h-4 text-blue-600"
                        />
                        <input
                          type="text"
                          name={`answer${i}`}
                          defaultValue={answer.answerText}
                          required
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder:text-gray-500"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                    >
                      Speichern
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingQuestionId(null)}
                      className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition"
                    >
                      Abbrechen
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      {question.title && (
                        <div className="text-sm font-medium text-gray-600 mb-1">
                          {question.title}
                        </div>
                      )}
                      <h3 className="font-semibold text-lg text-gray-900">
                        {index + 1}. {question.questionText}
                      </h3>
                      {question.description && (
                        <p className="text-sm text-gray-700 mt-2">
                          {question.description}
                        </p>
                      )}
                      {question.imageUrl && (
                        <img
                          src={question.imageUrl}
                          alt="Fragenbild"
                          className="mt-3 max-w-md rounded-lg border border-gray-300"
                        />
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => setEditingQuestionId(question.id)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Bearbeiten
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(question.id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Löschen
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {question.answers.map((answer, i) => (
                      <div
                        key={answer.id}
                        className={`px-3 py-2 rounded ${
                          answer.isCorrect
                            ? "bg-green-100 border border-green-300 text-green-900"
                            : "bg-gray-100 border border-gray-300 text-gray-900"
                        }`}
                      >
                        {String.fromCharCode(65 + i)}. {answer.answerText}
                        {answer.isCorrect && (
                          <span className="ml-2 text-green-700 font-semibold">✓ Richtig</span>
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
