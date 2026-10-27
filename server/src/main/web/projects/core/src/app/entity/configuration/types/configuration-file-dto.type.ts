export type TConfigurationFileDTO = {
  id?: number;
  description: string | null;
  externalUrl: string | null;
  filePath: string | null;
  checksum: string | null;
  remove: boolean;
  lastUpdate: number;
  fileId: number;
  url: string;
  replaceVariables: boolean;
  // The server's JSON names (ConfigurationFile: @JsonProperty "path" and "overridePath")
  path: string;
  overridePath?: boolean;
};
