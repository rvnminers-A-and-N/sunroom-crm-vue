import type { User, AuthResponse } from '@/core/models/user'
import type { Tag } from '@/core/models/tag'
import type { Contact, ContactDetail } from '@/core/models/contact'
import type { Company, CompanyDetail } from '@/core/models/company'
import type { Deal, DealDetail, Pipeline, DealInsight } from '@/core/models/deal'
import type { Activity } from '@/core/models/activity'
import type { DashboardData } from '@/core/models/dashboard'
import type { SmartSearchResponse, SummarizeResponse } from '@/core/models/ai'
import type { PaginatedResponse, PaginationMeta } from '@/core/models/pagination'

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    role: 'User',
    avatarUrl: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

export function makeAdmin(overrides: Partial<User> = {}): User {
  return makeUser({ id: 99, name: 'Admin User', email: 'admin@example.com', role: 'Admin', ...overrides })
}

export function makeAuthResponse(overrides: Partial<AuthResponse> = {}): AuthResponse {
  return {
    token: 'test-token',
    user: makeUser(),
    ...overrides,
  }
}

export function makeTag(overrides: Partial<Tag> = {}): Tag {
  return {
    id: 1,
    name: 'VIP',
    color: '#02795f',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

export function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: 1,
    firstName: 'Grace',
    lastName: 'Hopper',
    email: 'grace@example.com',
    phone: '555-0100',
    title: 'Engineer',
    companyName: 'Acme Inc',
    companyId: 1,
    lastContactedAt: '2026-04-01T00:00:00.000Z',
    tags: [makeTag()],
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

export function makeContactDetail(overrides: Partial<ContactDetail> = {}): ContactDetail {
  return {
    id: 1,
    firstName: 'Grace',
    lastName: 'Hopper',
    email: 'grace@example.com',
    phone: '555-0100',
    title: 'Engineer',
    notes: 'Important contact',
    lastContactedAt: '2026-04-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
    company: null,
    tags: [makeTag()],
    deals: [],
    activities: [],
    ...overrides,
  }
}

export function makeCompany(overrides: Partial<Company> = {}): Company {
  return {
    id: 1,
    name: 'Acme Inc',
    industry: 'Software',
    website: 'https://acme.example.com',
    phone: '555-0200',
    city: 'Austin',
    state: 'TX',
    contactCount: 3,
    dealCount: 2,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

export function makeCompanyDetail(overrides: Partial<CompanyDetail> = {}): CompanyDetail {
  return {
    id: 1,
    name: 'Acme Inc',
    industry: 'Software',
    website: 'https://acme.example.com',
    phone: '555-0200',
    address: '1 Main St',
    city: 'Austin',
    state: 'TX',
    zip: '78701',
    notes: 'Key account',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
    contacts: [],
    deals: [],
    ...overrides,
  }
}

export function makeDeal(overrides: Partial<Deal> = {}): Deal {
  return {
    id: 1,
    title: 'Enterprise License',
    value: 25000,
    stage: 'Qualified',
    contactName: 'Grace Hopper',
    contactId: 1,
    companyName: 'Acme Inc',
    companyId: 1,
    expectedCloseDate: '2026-06-01T00:00:00.000Z',
    closedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

export function makeDealInsight(overrides: Partial<DealInsight> = {}): DealInsight {
  return {
    id: 1,
    insight: 'Buyer responded positively to the proposal.',
    generatedAt: '2026-04-01T00:00:00.000Z',
    ...overrides,
  }
}

export function makeDealDetail(overrides: Partial<DealDetail> = {}): DealDetail {
  return {
    id: 1,
    title: 'Enterprise License',
    value: 25000,
    stage: 'Qualified',
    contactName: 'Grace Hopper',
    contactId: 1,
    companyName: 'Acme Inc',
    companyId: 1,
    expectedCloseDate: '2026-06-01T00:00:00.000Z',
    closedAt: null,
    notes: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
    activities: [],
    insights: [],
    ...overrides,
  }
}

export function makePipeline(overrides: Partial<Pipeline> = {}): Pipeline {
  return {
    stages: [
      { stage: 'Lead', count: 2, totalValue: 5000, deals: [makeDeal({ id: 10, stage: 'Lead' })] },
      { stage: 'Qualified', count: 1, totalValue: 25000, deals: [makeDeal({ id: 11, stage: 'Qualified' })] },
      { stage: 'Proposal', count: 0, totalValue: 0, deals: [] },
      { stage: 'Negotiation', count: 0, totalValue: 0, deals: [] },
      { stage: 'Won', count: 1, totalValue: 10000, deals: [makeDeal({ id: 12, stage: 'Won' })] },
      { stage: 'Lost', count: 0, totalValue: 0, deals: [] },
    ],
    ...overrides,
  }
}

export function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 1,
    type: 'Note',
    subject: 'Intro call',
    body: 'Had a great first call.',
    aiSummary: null,
    contactId: 1,
    contactName: 'Grace Hopper',
    dealId: null,
    dealTitle: null,
    userName: 'Ada Lovelace',
    occurredAt: '2026-04-01T00:00:00.000Z',
    createdAt: '2026-04-01T00:00:00.000Z',
    ...overrides,
  }
}

export function makeDashboardData(overrides: Partial<DashboardData> = {}): DashboardData {
  return {
    totalContacts: 42,
    totalCompanies: 12,
    totalDeals: 8,
    totalPipelineValue: 125000,
    wonRevenue: 50000,
    dealsByStage: [
      { stage: 'Lead', count: 2, totalValue: 5000 },
      { stage: 'Qualified', count: 1, totalValue: 25000 },
      { stage: 'Proposal', count: 2, totalValue: 40000 },
      { stage: 'Negotiation', count: 1, totalValue: 20000 },
      { stage: 'Won', count: 2, totalValue: 50000 },
      { stage: 'Lost', count: 0, totalValue: 0 },
    ],
    recentActivities: [
      {
        id: 1,
        type: 'Call',
        subject: 'Follow-up call',
        contactName: 'Grace Hopper',
        userName: 'Ada Lovelace',
        occurredAt: '2026-04-01T00:00:00.000Z',
      },
    ],
    ...overrides,
  }
}

export function makeSmartSearchResponse(overrides: Partial<SmartSearchResponse> = {}): SmartSearchResponse {
  return {
    interpretation: 'Showing recent contacts at Acme',
    contacts: [makeContact()],
    activities: [makeActivity()],
    ...overrides,
  }
}

export function makeSummarizeResponse(overrides: Partial<SummarizeResponse> = {}): SummarizeResponse {
  return {
    summary: 'Short summary of the text.',
    ...overrides,
  }
}

export function makePaginationMeta(overrides: Partial<PaginationMeta> = {}): PaginationMeta {
  return {
    currentPage: 1,
    perPage: 20,
    total: 1,
    lastPage: 1,
    ...overrides,
  }
}

export function makePaginated<T>(items: T[], meta: Partial<PaginationMeta> = {}): PaginatedResponse<T> {
  return {
    data: items,
    meta: makePaginationMeta({ total: items.length, ...meta }),
  }
}
