// =============================================================================
// lib/grading/claude.ts — the Claude answer grader (server-only).
//
// Per platform-data-model-and-rules.md → "Grading": the child's answer is graded
// server-side (never from the browser — protects the API key) against the
// question's answer_key, which is treated as ground truth. Claude is instructed
// to accept reasonably-phrased equivalent answers (e.g. "1948" vs "בשנת 1948",
// minor spelling slips) rather than brittle exact-string matching, and to reply
// with a short, encouraging feedback message in the child's own language.
//
// Structured outputs (output_config.format) guarantee the response validates to
// { is_correct, feedback_message }, so no brittle text parsing.
// =============================================================================

import Anthropic from '@anthropic-ai/sdk'
import type { Locale } from '@/types/database'
import type { GradableQuestion, PlacementGrader } from '@/lib/placement/grader'

// Grading a child's short answer is a simple classification task that runs 5×/day
// per child, so default to Haiku (fast + cheap). Override with GRADING_MODEL for a
// more capable model if grading accuracy ever needs it. This is the live, pinned
// full model ID (verified against /v1/models).
const GRADING_MODEL = process.env.GRADING_MODEL ?? 'claude-haiku-4-5-20251001'

export interface GradeResult {
  isCorrect: boolean
  feedbackMessage: string
}

const RESULT_SCHEMA = {
  type: 'object',
  properties: {
    is_correct: {
      type: 'boolean',
      description: 'Whether the child’s answer is correct.',
    },
    feedback_message: {
      type: 'string',
      description:
        'A short, warm, encouraging message for the child in their own language. On a correct answer, praise them. On an incorrect answer, stay kind and include the correct answer for learning value.',
    },
  },
  required: ['is_correct', 'feedback_message'],
  additionalProperties: false,
} as const

function localeName(locale: Locale): string {
  return locale === 'he' ? 'Hebrew' : 'English'
}

const SYSTEM_PROMPT = `You are grading a child's answer to a daily trivia question on a kids' rewards app. Real money is awarded for correct answers, so grade carefully and fairly.

Rules:
- The provided answer key is the ground truth. Judge the child's answer against it, not against your own general knowledge.
- Accept any reasonably-phrased equivalent: different valid phrasings, extra words ("in 1948" vs "1948"), minor spelling or typing slips, and correct answers given in either Hebrew or English.
- Do NOT accept an answer that is factually wrong, blank, or off-topic, however confidently phrased.
- Keep feedback short (one or two sentences), warm, and age-appropriate. Never shame a wrong answer.
- Write the feedback_message in the child's language. On a correct answer, celebrate briefly. On an incorrect answer, gently give the correct answer so the child learns.`

let cachedClient: Anthropic | null = null
function client(): Anthropic {
  if (!cachedClient) cachedClient = new Anthropic()
  return cachedClient
}

/**
 * Grade a single answer with Claude. Returns the verdict plus a localized
 * feedback message. Throws on API errors or a malformed response.
 */
export async function gradeAnswer(input: {
  question: GradableQuestion
  answerText: string
  locale: Locale
}): Promise<GradeResult> {
  const { question, answerText, locale } = input

  const userPrompt = [
    `Question (${localeName(locale)}): ${question.text}`,
    `Answer key (ground truth): ${question.answerKey}`,
    `Child's answer: ${answerText || '(no answer given)'}`,
    '',
    `Reply with the child's language being ${localeName(locale)}.`,
  ].join('\n')

  const response = await client().messages.create({
    model: GRADING_MODEL,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    output_config: {
      // Structured output guarantees the { is_correct, feedback_message } shape.
      // No `effort` here: it's unsupported on Haiku (the default grading model)
      // and unneeded for a simple classification task.
      format: { type: 'json_schema', schema: RESULT_SCHEMA },
    },
    messages: [{ role: 'user', content: userPrompt }],
  })

  if (response.stop_reason === 'refusal') {
    throw new Error('Grading refused by the model safety classifier')
  }

  const jsonText = response.content.find((b) => b.type === 'text')?.text
  if (!jsonText) {
    throw new Error('Grader returned no structured output')
  }

  const parsed = JSON.parse(jsonText) as {
    is_correct: boolean
    feedback_message: string
  }
  return {
    isCorrect: parsed.is_correct,
    feedbackMessage: parsed.feedback_message,
  }
}

/**
 * Adapter that lets the placement quiz reuse this exact grader — it satisfies
 * the PlacementGrader interface built earlier (placement only reads isCorrect).
 */
export const claudePlacementGrader: PlacementGrader = {
  async grade(input) {
    const { isCorrect } = await gradeAnswer(input)
    return { isCorrect }
  },
}
