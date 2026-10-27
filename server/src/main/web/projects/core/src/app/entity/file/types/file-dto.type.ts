export type TFileDTO = {
  id: number;
  filePath: string | null;
  description: string;
  url: string;
  size: number;
  uploadTime: number;
  devicePath: string;
  external: boolean;
  // Sent when saving an external file: the server stores the URL from this field
  externalUrl?: string;
  replaceVariables: boolean;
  usedByApps: boolean | null;
  usedByIcons: string[];
  usedByConfigurations: string[];
};
