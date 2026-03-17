import { describe, it, expect } from 'vitest'
import {
  parseQuestions,
  parseAnswers,
  matchAnswersToQuestions,
  serializeAnswers,
} from '../../utils/parsing'

describe('parseQuestions', () => {
  it('returns [] for null/undefined', () => {
    expect(parseQuestions(null)).toEqual([])
    expect(parseQuestions(undefined)).toEqual([])
  })

  it('returns the array directly if already an array', () => {
    const questions = [{ id: 'q1', type: 'text', text: 'How are you?' }]
    expect(parseQuestions({ questions })).toEqual(questions)
  })

  it('parses a valid JSON string', () => {
    const questions = [{ id: 'q1', type: 'text', text: 'How are you?' }]
    expect(parseQuestions({ questions: JSON.stringify(questions) })).toEqual(questions)
  })

  it('returns [] for invalid JSON string', () => {
    expect(parseQuestions({ questions: 'not-json' })).toEqual([])
  })

  it('returns [] if parsed JSON is not an array', () => {
    expect(parseQuestions({ questions: JSON.stringify({ key: 'val' }) })).toEqual([])
  })

  it('returns [] when questions field is absent', () => {
    expect(parseQuestions({})).toEqual([])
  })
})

describe('parseAnswers', () => {
  it('returns [] for null/undefined', () => {
    expect(parseAnswers(null)).toEqual([])
    expect(parseAnswers(undefined)).toEqual([])
  })

  it('normalizes current-format answers', () => {
    const record = {
      answers: [{ questionId: 'q1', value: 'yes' }],
    }
    expect(parseAnswers(record)).toEqual([{ questionId: 'q1', value: 'yes' }])
  })

  it('normalizes legacy plain-string answers', () => {
    const record = { answers: ['answer1', 'answer2'] }
    const result = parseAnswers(record)
    expect(result).toEqual([
      { questionId: null, value: 'answer1' },
      { questionId: null, value: 'answer2' },
    ])
  })

  it('parses answers from a JSON string', () => {
    const record = {
      answers: JSON.stringify([{ questionId: 'q1', value: 'yes' }]),
    }
    expect(parseAnswers(record)).toEqual([{ questionId: 'q1', value: 'yes' }])
  })

  it('returns [] for invalid JSON string', () => {
    expect(parseAnswers({ answers: 'not-json' })).toEqual([])
  })
})

describe('matchAnswersToQuestions', () => {
  const questions = [
    { id: 'q1', type: 'text', text: 'Q1' },
    { id: 'q2', type: 'scale', text: 'Q2' },
  ]

  it('matches current-format answers by questionId', () => {
    const answers = [
      { questionId: 'q1', value: 'resp1' },
      { questionId: 'q2', value: 'resp2' },
    ]
    expect(matchAnswersToQuestions(questions, answers)).toEqual({
      q1: 'resp1',
      q2: 'resp2',
    })
  })

  it('matches legacy answers by array index', () => {
    const answers = [
      { questionId: null, value: 'resp1' },
      { questionId: null, value: 'resp2' },
    ]
    expect(matchAnswersToQuestions(questions, answers)).toEqual({
      q1: 'resp1',
      q2: 'resp2',
    })
  })

  it('returns empty string for missing answer', () => {
    const answers = [{ questionId: null, value: 'only-one' }]
    const result = matchAnswersToQuestions(questions, answers)
    expect(result['q2']).toBe('')
  })
})

describe('serializeAnswers', () => {
  it('returns a valid JSON string', () => {
    const questions = [{ id: 'q1' }, { id: 'q2' }]
    const values = { q1: 'yes', q2: 'no' }
    const result = serializeAnswers(questions, values)
    expect(() => JSON.parse(result)).not.toThrow()
  })

  it('includes all questions in the serialized output', () => {
    const questions = [{ id: 'q1' }, { id: 'q2' }]
    const values = { q1: 'hello' }
    const parsed = JSON.parse(serializeAnswers(questions, values))
    expect(parsed).toHaveLength(2)
    expect(parsed[0]).toEqual({ questionId: 'q1', value: 'hello' })
    expect(parsed[1]).toEqual({ questionId: 'q2', value: '' })
  })
})
