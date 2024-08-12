export type AudioSample = {
  name: string;
  path: string;
};

export function isAudioSample(entity: any): entity is AudioSample {
  return "name" in entity && "path" in entity;
}
