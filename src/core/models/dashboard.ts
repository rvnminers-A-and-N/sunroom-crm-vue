export interface DashboardData {
  totalContacts: number
  totalCompanies: number
  totalDeals: number
  totalActivities: number
  totalDealValue: number
  dealsByStage: DealStageCount[]
  recentActivities: RecentActivity[]
}

export interface DealStageCount {
  stage: string
  count: number
  totalValue: number
}

export interface RecentActivity {
  id: number
  type: string
  subject: string
  contactName: string | null
  occurredAt: string
}
