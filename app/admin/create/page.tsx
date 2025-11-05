import { redirect } from "next/navigation";
import { getTranslations } from 'next-intl/server';
import { prisma } from "@/lib/prisma";
import { AdminHeader } from "@/app/components/AdminHeader";
import { QuizLanguageSelector } from "@/app/components/QuizLanguageSelector";
import { BackButton } from "@/app/components/BackButton";
import { isAuthenticated } from "@/lib/auth";
import AuthForm from "@/app/components/AuthForm";
import { AdminFooter } from "@/app/components/AdminFooter";
import { Card } from "@/app/components/Card";
import { Button } from "@/app/components/Button";
import { FormInput } from "@/app/components/FormInput";

async function createQuiz(formData: FormData) {
  "use server";

  // Re-check authentication (defense in depth)
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    throw new Error("Unauthorized");
  }

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const language = (formData.get("language") as string) || "en";

  if (!title) {
    return;
  }

  const quiz = await prisma.quiz.create({
    data: {
      title,
      description: description || null,
      language,
    },
  });

  redirect(`/admin/${quiz.id}/edit`);
}

export const dynamic = 'force-dynamic';

export default async function CreateQuizPage() {
  // Check authentication
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return <AuthForm redirectTo="/admin/create" />;
  }

  const t = await getTranslations('admin');
  const tCommon = await getTranslations('common');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-4 md:py-8 transition-colors">
      <div className="max-w-4xl mx-auto px-3 md:px-4">
        <AdminHeader title={t('createNewQuiz')} showBackButton={true} backButtonHref="/admin" />

        <Card variant="form" className="p-4 md:p-6">
          <form action={createQuiz}>
            <FormInput
              type="text"
              id="title"
              name="title"
              label={t('quizTitleRequired')}
              placeholder={t('quizTitlePlaceholder')}
              required
            />

            <FormInput
              as="textarea"
              id="description"
              name="description"
              label={t('quizDescription')}
              placeholder={t('quizDescriptionPlaceholder')}
              rows={4}
            />

            <div className="mb-6">
              <label
                htmlFor="language"
                className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2"
              >
                {t('language')}
              </label>
              <QuizLanguageSelector name="language" id="language" defaultValue="en" />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
              <Button type="submit" variant="primary" size="lg" fullWidth className="flex-1">
                {t('createQuiz')}
              </Button>
              <BackButton>
                <Button type="button" variant="secondary" size="lg" fullWidth className="flex-1">
                  {tCommon('cancel')}
                </Button>
              </BackButton>
            </div>
          </form>
        </Card>
        <AdminFooter />
      </div>
    </div>
  );
}
