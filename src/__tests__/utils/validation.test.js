import { describe, it, expect } from 'vitest'
import {
  validateRegisterForm,
  validateExerciseForm,
  validateLoginForm,
  validateDiaryEntry,
  validateActivityForm,
  validateResetEmail,
  validateInviteCode,
} from '../../utils/validation'

describe('validateRegisterForm', () => {
  const base = {
    name: 'João Silva',
    email: 'joao@email.com',
    password: 'senha123',
    confirm: 'senha123',
    role: 'therapist',
    crp: '06/12345',
  }

  it('returns null for valid therapist form', () => {
    expect(validateRegisterForm(base)).toBeNull()
  })

  it('errors when name is empty', () => {
    expect(validateRegisterForm({ ...base, name: '' })).toBeTruthy()
  })

  it('errors for invalid email', () => {
    expect(validateRegisterForm({ ...base, email: 'not-an-email' })).toBeTruthy()
  })

  it('errors when password is too short', () => {
    expect(validateRegisterForm({ ...base, password: '123', confirm: '123' })).toBeTruthy()
  })

  it('errors when passwords do not match', () => {
    expect(validateRegisterForm({ ...base, confirm: 'different' })).toBeTruthy()
  })

  it('errors when patient has no invite code', () => {
    expect(
      validateRegisterForm({ ...base, role: 'patient', inviteCode: '' })
    ).toBeTruthy()
  })

  it('returns null for valid patient form with invite code', () => {
    expect(
      validateRegisterForm({ ...base, role: 'patient', inviteCode: 'ABC123', crp: undefined })
    ).toBeNull()
  })

  it('errors when therapist has no CRP', () => {
    expect(validateRegisterForm({ ...base, crp: '' })).toBeTruthy()
  })
})

describe('validateExerciseForm', () => {
  const questions = [{ text: 'Como você está?' }]

  it('returns null for valid form', () => {
    expect(validateExerciseForm({ title: 'Exercício 1', description: 'Desc' }, questions)).toBeNull()
  })

  it('errors when title is empty', () => {
    expect(validateExerciseForm({ title: '', description: 'Desc' }, questions)).toBeTruthy()
  })

  it('errors when title is too short', () => {
    expect(validateExerciseForm({ title: 'AB', description: 'Desc' }, questions)).toBeTruthy()
  })

  it('errors when description is empty', () => {
    expect(validateExerciseForm({ title: 'Exercício 1', description: '' }, questions)).toBeTruthy()
  })

  it('errors when questions array is empty', () => {
    expect(validateExerciseForm({ title: 'Exercício 1', description: 'Desc' }, [])).toBeTruthy()
  })

  it('errors when a question text is empty', () => {
    expect(
      validateExerciseForm({ title: 'Exercício 1', description: 'Desc' }, [{ text: '' }])
    ).toBeTruthy()
  })
})

describe('validateLoginForm', () => {
  it('returns null for valid form', () => {
    expect(validateLoginForm({ email: 'a@b.com', password: '123456' })).toBeNull()
  })

  it('errors when email is empty', () => {
    expect(validateLoginForm({ email: '', password: '123456' })).toBeTruthy()
  })

  it('errors when password is empty', () => {
    expect(validateLoginForm({ email: 'a@b.com', password: '' })).toBeTruthy()
  })
})

describe('validateDiaryEntry', () => {
  it('returns null when mood is set', () => {
    expect(validateDiaryEntry({ mood: 3 })).toBeNull()
  })

  it('returns null when mood is 0', () => {
    expect(validateDiaryEntry({ mood: 0 })).toBeNull()
  })

  it('errors when mood is null', () => {
    expect(validateDiaryEntry({ mood: null })).toBeTruthy()
  })

  it('errors when mood is undefined', () => {
    expect(validateDiaryEntry({})).toBeTruthy()
  })
})

describe('validateActivityForm', () => {
  const valid = { title: 'Caminhar', date: '2025-07-14', time: '08:00' }

  it('returns null for valid form', () => {
    expect(validateActivityForm(valid)).toBeNull()
  })

  it('errors when title is empty', () => {
    expect(validateActivityForm({ ...valid, title: '' })).toBeTruthy()
  })

  it('errors when date is missing', () => {
    expect(validateActivityForm({ ...valid, date: '' })).toBeTruthy()
  })

  it('errors when time is missing', () => {
    expect(validateActivityForm({ ...valid, time: '' })).toBeTruthy()
  })
})

describe('validateResetEmail', () => {
  it('returns null for a valid email', () => {
    expect(validateResetEmail('user@email.com')).toBeNull()
  })

  it('errors for empty email', () => {
    expect(validateResetEmail('')).toBeTruthy()
  })

  it('errors for invalid email', () => {
    expect(validateResetEmail('not-valid')).toBeTruthy()
  })
})

describe('validateInviteCode', () => {
  it('returns null for a valid code', () => {
    expect(validateInviteCode('ABC123')).toBeNull()
  })

  it('errors for empty code', () => {
    expect(validateInviteCode('')).toBeTruthy()
  })

  it('errors for lowercase code', () => {
    expect(validateInviteCode('abc123')).toBeTruthy()
  })

  it('errors for too short code (< 4 chars)', () => {
    expect(validateInviteCode('AB1')).toBeTruthy()
  })

  it('errors for too long code (> 10 chars)', () => {
    expect(validateInviteCode('ABCDEFGHIJK')).toBeTruthy()
  })
})
