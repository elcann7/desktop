export interface McpSettings {
  enabled: boolean;
  port: number;
}

export interface McpStatus {
  running: boolean;
  port: number | null;
  enabled: boolean;
}
