import dotenv from 'dotenv';
dotenv.config();

const PROTONEST_API_URL = process.env.PROTONEST_API_URL || 'https://api.protonestconnect.co/api/v1/user';

interface TokenResponse {
  fullName: string;
  jwtToken: string;
  refreshToken: string;
}

interface StreamDataRecord {
  id: string;
  deviceId: string;
  topicSuffix?: string;
  topic?: string;
  payload: string;
  timestamp: string;
}

interface StreamDataResponse {
  status: string;
  data: StreamDataRecord[];
}

interface StateResponse {
  status: string;
  data: Array<{
    id: string;
    deviceId: string;
    topicSuffix?: string;
    topic?: string;
    payload: string;
    timestamp: string;
  }>;
}

export async function getToken(email: string, password: string): Promise<TokenResponse> {
  const res = await fetch(`${PROTONEST_API_URL}/get-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Protonest auth failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<any>;
}

export async function renewToken(refreshToken: string): Promise<TokenResponse> {
  const res = await fetch(`${PROTONEST_API_URL}/get-new-token`, {
    method: 'GET',
    headers: { 'X-Refresh-Token': refreshToken },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Protonest token refresh failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<any>;
}

export async function getStreamDataByDevice(
  jwt: string,
  deviceId: string,
  startTime?: string,
  endTime?: string,
  pagination?: number,
  pageSize?: number
): Promise<StreamDataResponse> {
  const now = new Date();
  const body = {
    deviceId,
    startTime: startTime || new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
    endTime: endTime || now.toISOString(),
    pagination: String(pagination ?? 0),
    pageSize: String(pageSize ?? 100),
  };

  const res = await fetch(`${PROTONEST_API_URL}/get-stream-data/device`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwt}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Protonest stream data failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<any>;
}

export async function getStreamDataByDeviceTopic(
  jwt: string,
  deviceId: string,
  topic: string,
  startTime?: string,
  endTime?: string,
): Promise<StreamDataResponse> {
  const now = new Date();
  const body = {
    deviceId,
    topic,
    startTime: startTime || new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
    endTime: endTime || now.toISOString(),
    pagination: "0",
    pageSize: "100",
  };

  const res = await fetch(`${PROTONEST_API_URL}/get-stream-data/device/topic`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwt}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Protonest stream data by topic failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<any>;
}

export async function getStateDetails(jwt: string, deviceId: string): Promise<StateResponse> {
  const res = await fetch(`${PROTONEST_API_URL}/get-state-details/device`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwt}`,
    },
    body: JSON.stringify({ deviceId }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Protonest state details failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<any>;
}

export async function getStateByTopic(
  jwt: string,
  deviceId: string,
  topic: string
): Promise<StateResponse> {
  const res = await fetch(`${PROTONEST_API_URL}/get-state-details/device/topic`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwt}`,
    },
    body: JSON.stringify({ deviceId, topic }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Protonest state by topic failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<any>;
}
