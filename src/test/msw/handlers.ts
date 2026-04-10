import { http, HttpResponse } from 'msw'
import {
  makeActivity,
  makeAdmin,
  makeAuthResponse,
  makeCompany,
  makeCompanyDetail,
  makeContact,
  makeContactDetail,
  makeDashboardData,
  makeDeal,
  makeDealDetail,
  makePaginated,
  makePipeline,
  makeSmartSearchResponse,
  makeSummarizeResponse,
  makeTag,
  makeUser,
} from '../fixtures'

const API = 'http://localhost:5236/api'

/**
 * Default handlers return happy-path data for every endpoint the app uses.
 * Individual tests can override by calling `server.use(...)`.
 */
export const handlers = [
  // Auth
  http.post(`${API}/auth/login`, async () => HttpResponse.json(makeAuthResponse())),
  http.post(`${API}/auth/register`, async () => HttpResponse.json(makeAuthResponse())),
  http.get(`${API}/auth/me`, () => HttpResponse.json(makeUser())),

  // Contacts
  http.get(`${API}/contacts`, () => HttpResponse.json(makePaginated([makeContact()]))),
  http.get(`${API}/contacts/:id`, ({ params }) =>
    HttpResponse.json(makeContactDetail({ id: Number(params.id) })),
  ),
  http.post(`${API}/contacts`, () => HttpResponse.json(makeContact(), { status: 201 })),
  http.put(`${API}/contacts/:id`, ({ params }) =>
    HttpResponse.json(makeContact({ id: Number(params.id) })),
  ),
  http.delete(`${API}/contacts/:id`, () => new HttpResponse(null, { status: 204 })),
  http.put(`${API}/contacts/:id/tags`, () => new HttpResponse(null, { status: 204 })),

  // Companies
  http.get(`${API}/companies`, () => HttpResponse.json(makePaginated([makeCompany()]))),
  http.get(`${API}/companies/:id`, ({ params }) =>
    HttpResponse.json(makeCompanyDetail({ id: Number(params.id) })),
  ),
  http.post(`${API}/companies`, () => HttpResponse.json(makeCompany(), { status: 201 })),
  http.put(`${API}/companies/:id`, ({ params }) =>
    HttpResponse.json(makeCompany({ id: Number(params.id) })),
  ),
  http.delete(`${API}/companies/:id`, () => new HttpResponse(null, { status: 204 })),

  // Deals
  http.get(`${API}/deals/pipeline`, () => HttpResponse.json(makePipeline())),
  http.get(`${API}/deals`, () => HttpResponse.json(makePaginated([makeDeal()]))),
  http.get(`${API}/deals/:id`, ({ params }) =>
    HttpResponse.json(makeDealDetail({ id: Number(params.id) })),
  ),
  http.post(`${API}/deals`, () => HttpResponse.json(makeDeal(), { status: 201 })),
  http.put(`${API}/deals/:id`, ({ params }) =>
    HttpResponse.json(makeDeal({ id: Number(params.id) })),
  ),
  http.delete(`${API}/deals/:id`, () => new HttpResponse(null, { status: 204 })),

  // Activities
  http.get(`${API}/activities`, () => HttpResponse.json(makePaginated([makeActivity()]))),
  http.post(`${API}/activities`, () => HttpResponse.json(makeActivity(), { status: 201 })),
  http.put(`${API}/activities/:id`, ({ params }) =>
    HttpResponse.json(makeActivity({ id: Number(params.id) })),
  ),
  http.delete(`${API}/activities/:id`, () => new HttpResponse(null, { status: 204 })),

  // Tags
  http.get(`${API}/tags`, () => HttpResponse.json([makeTag()])),
  http.post(`${API}/tags`, () => HttpResponse.json(makeTag(), { status: 201 })),
  http.put(`${API}/tags/:id`, ({ params }) => HttpResponse.json(makeTag({ id: Number(params.id) }))),
  http.delete(`${API}/tags/:id`, () => new HttpResponse(null, { status: 204 })),

  // Dashboard
  http.get(`${API}/dashboard`, () => HttpResponse.json(makeDashboardData())),

  // AI
  http.post(`${API}/ai/search`, () => HttpResponse.json(makeSmartSearchResponse())),
  http.post(`${API}/ai/summarize`, () => HttpResponse.json(makeSummarizeResponse())),

  // Admin
  http.get(`${API}/admin/users`, () => HttpResponse.json([makeUser(), makeAdmin()])),
  http.put(`${API}/admin/users/:id`, ({ params }) =>
    HttpResponse.json(makeUser({ id: Number(params.id) })),
  ),
  http.delete(`${API}/admin/users/:id`, () => new HttpResponse(null, { status: 204 })),
]
