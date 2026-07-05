export type DocumentKind = 'plans' | 'permits' | 'contracts' | 'soils' | 'grading' | 'plot' | 'photos' | 'other'
export type DocumentStatus = 'needed' | 'received' | 'on_file'

export interface Document {
  id: string
  projectId: string
  milestoneId: string | null
  name: string
  kind: DocumentKind
  status: DocumentStatus
  link: string | null
  s3Key: string | null
  createdAt: string
  updatedAt: string
}
