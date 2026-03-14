import { apiFetch } from "../context/AuthContext";
import type {
  ContactResponseDto,
  CreateContactDto,
  RespondContactDto,
  ContactQueryDto,
  ContactListResponse,
  ContactStatistics,
} from "../types/message.types";

const BASE_URL = import.meta.env.VITE_API_URL;

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMessage = `Erreur ${res.status}`;
    try {
      const errorData = await res.json();
      errorMessage = errorData.message || errorMessage;
    } catch {
      // Ignorer
    }
    throw new Error(errorMessage);
  }

  if (res.status === 204) return undefined as T;

  const data = await res.json();
  console.log("[message.service] Raw response data:", data);

  // Le backend retourne directement les données ou dans un wrapper data
  const result = (data.data ?? data) as T;
  console.log("[message.service] Final parsed result:", result);

  return result;
}

export const MessagesService = {
  // Routes publiques
  async create(payload: CreateContactDto): Promise<ContactResponseDto> {
    const res = await apiFetch(`${BASE_URL}/contacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleResponse<ContactResponseDto>(res);
  },

  // Routes admin
  async findAll(query: ContactQueryDto = {}): Promise<ContactListResponse> {
    const params = new URLSearchParams();

    if (query.page) params.set("page", String(query.page));
    if (query.limit) params.set("limit", String(query.limit));
    if (query.isRead !== undefined) params.set("isRead", String(query.isRead));
    if (query.isReplied !== undefined)
      params.set("isReplied", String(query.isReplied));
    if (query.email) params.set("email", query.email);
    if (query.search) params.set("search", query.search);
    if (query.startDate) params.set("startDate", query.startDate);
    if (query.endDate) params.set("endDate", query.endDate);
    if (query.sortBy) params.set("sortBy", query.sortBy);
    if (query.sortOrder) params.set("sortOrder", query.sortOrder);
    if (query.showDeleted) params.set("showDeleted", "true");

    console.log("[message.service] findAll called with query:", query);
    const url = `${BASE_URL}/admin/contacts/all?${params}`;
    console.log("[message.service] Fetching URL:", url);

    const res = await apiFetch(url);
    console.log("[message.service] Response status:", res.status);

    const result = await handleResponse<ContactListResponse>(res);
    console.log("[message.service] Parsed result:", result);
    console.log("[message.service] Messages count:", result.data?.length || 0);

    return result;
  },

  async getStatistics(): Promise<ContactStatistics> {
    console.log("[message.service] getStatistics called");
    const url = `${BASE_URL}/admin/contacts/statistics`;
    console.log("[message.service] Fetching URL:", url);

    const res = await apiFetch(url);
    console.log("[message.service] Response status:", res.status);

    const result = await handleResponse<ContactStatistics>(res);
    console.log("[message.service] Parsed result:", result);

    return result;
  },

  async getUnreadCount(): Promise<{ count: number }> {
    const res = await apiFetch(`${BASE_URL}/admin/contacts/unread-count`);
    return handleResponse<{ count: number }>(res);
  },

  async findById(id: string): Promise<ContactResponseDto> {
    const res = await apiFetch(`${BASE_URL}/admin/contacts/${id}`);
    return handleResponse<ContactResponseDto>(res);
  },

  async respond(
    id: string,
    payload: RespondContactDto,
  ): Promise<ContactResponseDto> {
    const res = await apiFetch(`${BASE_URL}/admin/contacts/${id}/respond`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleResponse<ContactResponseDto>(res);
  },

  async markAsRead(id: string, isRead: boolean): Promise<ContactResponseDto> {
    const res = await apiFetch(`${BASE_URL}/admin/contacts/${id}/read`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isRead }),
    });
    return handleResponse<ContactResponseDto>(res);
  },

  async markAllAsRead(): Promise<{ count: number }> {
    const res = await apiFetch(`${BASE_URL}/admin/contacts/mark-all-read`, {
      method: "POST",
    });
    return handleResponse<{ count: number }>(res);
  },

  async remove(id: string): Promise<void> {
    const res = await apiFetch(`${BASE_URL}/admin/contacts/${id}/delete`, {
      method: "DELETE",
    });
    return handleResponse<void>(res);
  },

  async removePermanent(id: string): Promise<void> {
    const res = await apiFetch(
      `${BASE_URL}/admin/contacts/${id}/delete?permanent=true`,
      {
        method: "DELETE",
      },
    );
    return handleResponse<void>(res);
  },
};
