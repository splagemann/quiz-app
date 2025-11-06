/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { createTestQuiz, cleanupTestQuiz, type TestQuiz } from '../utils/test-helpers';
import QuizPlayer from '@/app/game/[quizId]/solo/QuizPlayer';

// Import translation files
import enMessages from '@/locales/en.json';

const messages = { en: enMessages };

describe('Single Player E2E - Solo Game Flow', () => {
  let testQuiz: TestQuiz;

  beforeEach(async () => {
    // Create a test quiz with 3 questions, 4 answers each
    testQuiz = await createTestQuiz({
      title: 'E2E Test Quiz',
      questionCount: 3,
      answersPerQuestion: 4,
      language: 'en',
    });
  });

  afterEach(async () => {
    if (testQuiz) {
      await cleanupTestQuiz(testQuiz.id);
    }
  });

  const renderQuizPlayer = (quiz: TestQuiz) => {
    return render(
      <NextIntlClientProvider locale="en" messages={messages.en}>
        <QuizPlayer quiz={quiz} />
      </NextIntlClientProvider>
    );
  };

  it('should complete a full solo game with mixed correct/incorrect answers', async () => {
    const user = userEvent.setup();
    renderQuizPlayer(testQuiz);

    // Verify first question is displayed
    expect(screen.getByText(/Question 1 of 3/i)).toBeInTheDocument();
    expect(screen.getByText(testQuiz.questions[0].questionText)).toBeInTheDocument();

    // Answer first question correctly (first answer is always correct in test data)
    const firstCorrectAnswer = screen.getByRole('button', {
      name: new RegExp(testQuiz.questions[0].answers[0].answerText, 'i'),
    });
    await user.click(firstCorrectAnswer);

    // Verify answer is revealed and correct
    await waitFor(() => {
      expect(screen.getByText(/Correct!/i)).toBeInTheDocument();
    });

    // Go to next question
    const nextButton = screen.getByRole('button', { name: /Next Question/i });
    await user.click(nextButton);

    // Verify second question is displayed
    await waitFor(() => {
      expect(screen.getByText(/Question 2 of 3/i)).toBeInTheDocument();
    });
    expect(screen.getByText(testQuiz.questions[1].questionText)).toBeInTheDocument();

    // Answer second question incorrectly (select second answer, which is incorrect)
    const secondWrongAnswer = screen.getByRole('button', {
      name: new RegExp(testQuiz.questions[1].answers[1].answerText, 'i'),
    });
    await user.click(secondWrongAnswer);

    // Verify answer is revealed and incorrect
    await waitFor(() => {
      expect(screen.getByText(/Incorrect/i)).toBeInTheDocument();
    });

    // Go to next question
    const nextButton2 = screen.getByRole('button', { name: /Next Question/i });
    await user.click(nextButton2);

    // Verify third question is displayed
    await waitFor(() => {
      expect(screen.getByText(/Question 3 of 3/i)).toBeInTheDocument();
    });

    // Answer third question correctly
    const thirdCorrectAnswer = screen.getByRole('button', {
      name: new RegExp(testQuiz.questions[2].answers[0].answerText, 'i'),
    });
    await user.click(thirdCorrectAnswer);

    // Verify answer is revealed
    await waitFor(() => {
      expect(screen.getByText(/Correct!/i)).toBeInTheDocument();
    });

    // Complete the quiz
    const finishButton = screen.getByRole('button', { name: /Finish Quiz/i });
    await user.click(finishButton);

    // Verify completion screen with 2/3 correct (66.67%)
    await waitFor(() => {
      expect(screen.getByText(/Quiz Completed!/i)).toBeInTheDocument();
      expect(screen.getByText(/2.*of.*3/i)).toBeInTheDocument(); // 2 of 3 correct
      expect(screen.getByText(/66/i)).toBeInTheDocument(); // 66% or 66.67%
    });
  });

  it('should achieve 100% score with all correct answers', async () => {
    const user = userEvent.setup();
    renderQuizPlayer(testQuiz);

    // Answer all questions correctly
    for (let i = 0; i < testQuiz.questions.length; i++) {
      const question = testQuiz.questions[i];
      const correctAnswer = question.answers[0]; // First answer is always correct

      // Select correct answer
      const answerButton = screen.getByRole('button', {
        name: new RegExp(correctAnswer.answerText, 'i'),
      });
      await user.click(answerButton);

      // Wait for answer reveal
      await waitFor(() => {
        expect(screen.getByText(/Correct!/i)).toBeInTheDocument();
      });

      // Go to next question or finish
      if (i < testQuiz.questions.length - 1) {
        const nextButton = screen.getByRole('button', { name: /Next Question/i });
        await user.click(nextButton);
        await waitFor(() => {
          expect(screen.getByText(new RegExp(`Question ${i + 2} of 3`, 'i'))).toBeInTheDocument();
        });
      } else {
        const finishButton = screen.getByRole('button', { name: /Finish Quiz/i });
        await user.click(finishButton);
      }
    }

    // Verify 100% score
    await waitFor(() => {
      expect(screen.getByText(/Quiz Completed!/i)).toBeInTheDocument();
      expect(screen.getByText(/3.*of.*3/i)).toBeInTheDocument();
      expect(screen.getByText(/100/i)).toBeInTheDocument();
    });
  });

  it('should achieve 0% score with all wrong answers', async () => {
    const user = userEvent.setup();
    renderQuizPlayer(testQuiz);

    // Answer all questions incorrectly
    for (let i = 0; i < testQuiz.questions.length; i++) {
      const question = testQuiz.questions[i];
      const wrongAnswer = question.answers[1]; // Second answer is always incorrect

      // Select wrong answer
      const answerButton = screen.getByRole('button', {
        name: new RegExp(wrongAnswer.answerText, 'i'),
      });
      await user.click(answerButton);

      // Wait for answer reveal
      await waitFor(() => {
        expect(screen.getByText(/Incorrect/i)).toBeInTheDocument();
      });

      // Go to next question or finish
      if (i < testQuiz.questions.length - 1) {
        const nextButton = screen.getByRole('button', { name: /Next Question/i });
        await user.click(nextButton);
        await waitFor(() => {
          expect(screen.getByText(new RegExp(`Question ${i + 2} of 3`, 'i'))).toBeInTheDocument();
        });
      } else {
        const finishButton = screen.getByRole('button', { name: /Finish Quiz/i });
        await user.click(finishButton);
      }
    }

    // Verify 0% score
    await waitFor(() => {
      expect(screen.getByText(/Quiz Completed!/i)).toBeInTheDocument();
      expect(screen.getByText(/0.*of.*3/i)).toBeInTheDocument();
      expect(screen.getByText(/0%/i)).toBeInTheDocument();
    });
  });

  it('should display question metadata (title, description) when available', async () => {
    renderQuizPlayer(testQuiz);

    // Verify first question displays title and description
    expect(screen.getByText('Question 1')).toBeInTheDocument();
    expect(screen.getByText(/Description for question 1/i)).toBeInTheDocument();
  });

  it('should navigate back to quiz selection from completion screen', async () => {
    const user = userEvent.setup();

    // Mock router
    const mockPush = jest.fn();
    jest.mock('next/navigation', () => ({
      useRouter: () => ({
        push: mockPush,
        back: jest.fn(),
      }),
    }));

    renderQuizPlayer(testQuiz);

    // Complete quiz quickly
    for (let i = 0; i < testQuiz.questions.length; i++) {
      const question = testQuiz.questions[i];
      const answerButton = screen.getByRole('button', {
        name: new RegExp(question.answers[0].answerText, 'i'),
      });
      await user.click(answerButton);

      await waitFor(() => {
        expect(screen.getByText(/Correct!/i)).toBeInTheDocument();
      });

      if (i < testQuiz.questions.length - 1) {
        await user.click(screen.getByRole('button', { name: /Next Question/i }));
      } else {
        await user.click(screen.getByRole('button', { name: /Finish Quiz/i }));
      }
    }

    // Verify completion screen
    await waitFor(() => {
      expect(screen.getByText(/Quiz Completed!/i)).toBeInTheDocument();
    });

    // Click back to quiz selection
    const backButton = screen.getByRole('button', { name: /Back to quiz selection/i });
    expect(backButton).toBeInTheDocument();
  });
});
