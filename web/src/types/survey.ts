export type QuestionType = 'text' | 'multiple_choice' | 'rating'

export interface Survey {
  id: string
  owner_id: string
  title: string
  description: string | null
  primary_color: string
  logo_url: string | null
  created_at?: string
}

export interface QuestionConfig {
  options?: string[] // Used for multiple_choice options
  maxRating?: number // Used for rating (e.g. 5)
}

export interface Question {
  id: string
  survey_id: string
  type: QuestionType
  title: string
  position: number
  config_json: string // JSON string stored in the database representing QuestionConfig
}

export interface SurveyResponse {
  id: string
  survey_id: string
  submitted_at: string
}

export interface Answer {
  id: string
  response_id: string
  question_id: string
  value: string
}
