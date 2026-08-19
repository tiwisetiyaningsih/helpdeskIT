import { apiFetch } from "@/lib/apiFetch";

const API_URL = "http://localhost:3001";

export async function assignTicket(ticketId: number) {
  const token = localStorage.getItem("token");

  const response = await apiFetch(
    `${API_URL}/tickets/${ticketId}/assign`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message);
  }

  return data.ticket;
}