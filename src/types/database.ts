export interface Course {
  id: string
  course_code: string
  title: string
  credits: number
  sub_topics: string[]
  history_codes: string[]
  status: string
  is_active: boolean
  deleted_at: string | null
}

export interface Instructor {
  id: string
  name: string
  title: string
  email: string
  nature: string
}

export interface Section {
  id: string
  course_id: string
  year: number
  term: number
  quota_max: number
  quota_min: number
  enrolled_count: number
}

export interface Class {
  id: string
  section_id: string
  instructor_id: string
  class_code: string
  day_of_week: number
  start_time: string
  end_time: string
  location: string
  lang: string
}

export interface CourseEvaluation {
  id: string
  section_id: string
  course_mark: number
  teacher_mark: number
  response_rate: number
  created_by: string
  updated_at: string
}

export interface ClassWithDetails extends Class {
  course_code: string
  course_title: string
  section_year: number
  section_term: number
  enrolled_count: number
  quota_min: number
  quota_max: number
  instructor_name: string
  evaluation_data: CourseEvaluation | null
}

export interface InstructorOption {
  id: string
  name: string
}

export interface PhiAdmin {
  id: string
  username: string
  full_name: string
  status: string
  created_at: string
}

export interface AuditLog {
  id: string
  admin_id: string
  action: string
  table_name: string
  record_id: string
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  changed_at: string
}

export interface VInstructorWorkload {
  instructor_id: string
  name: string
  nature: string
  year: number
  term: number
  total_teaching_hours: number
}

export interface VStudentCourseCatalog {
  course_code: string
  title: string
  credits: number
  sub_topics: string[]
  lecturer_name: string
  year: number
  term: number
  enrolled_count: number
  quota_min: number
  quota_max: number
  class_code: string
}

export interface SectionDetail {
  section_id: string
  year: number
  term: number
  enrolled_count: number
  quota_min: number
  quota_max: number
  response_rate: number | null
  course_mark: number | null
  teacher_mark: number | null
  classes: Array<{
    id: string
    class_code: string
    instructor_id: string
    day_of_week: number
    start_time: string
    end_time: string
    location: string
    lang: string
  }>
  // Optional properties for class display mode
  class_code?: string
  instructor_id?: string
  day_of_week?: number
  start_time?: string
  end_time?: string
  location?: string
  lang?: string
}

export interface AdminCourseSummary {
  id: string
  course_code: string
  title: string
  credits: number
  sub_topics: string[]
  history_codes: string[]
  status: string
  is_active: boolean
  deleted_at: string | null
  section_id: string | null
  year: number | null
  term: number | null
  enrolled_count: number | null
  quota_min: number | null
  quota_max: number | null
  response_rate: number | null
  course_mark: number | null
  teacher_mark: number | null
  sections: SectionDetail[]
}

export interface AuditLogWithAdmin extends AuditLog {
  admin_name?: string
}

// Ticket System Types
export interface Ticket {
  id: string
  created_at: string
  client_id: string
  title: string
  description: string
  type: 'bug' | 'enhancement' | 'other'
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  photo_url?: string
}

export interface TicketComment {
  id: string
  ticket_id: string
  user_id: string
  comment: string
  created_at: string
}

export interface TicketWithComments extends Ticket {
  comments: TicketComment[]
}

export interface TicketFormData {
  title: string
  description: string
  type: 'bug' | 'enhancement' | 'other'
  photo?: File
}
