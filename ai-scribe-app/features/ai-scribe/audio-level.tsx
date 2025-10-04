import { useEffect, useRef, useState } from "react";

import clsx from "clsx";

const PROCESSOR_MODULE = "worklets/volume-level-processor.js";
const WORKLET_NAME = "berta-volume-level";

type AudioLevelProps = {
  stream: MediaStream | null;
  leds: number;
};

export const AudioLevel = ({ stream, leds }: AudioLevelProps) => {
  const audioContext = useRef<AudioContext | null>(null);
  const [volume, setVolume] = useState<number>(0);
  const [highestVolume, setHighestVolume] = useState<number>(0);

  const audioLevel =
    highestVolume > 0 ? easeOutCubic(volume / highestVolume) : 0;
  const ledLevels = Array.from(Array(leds), (_, i) => (1 / leds) * (i + 1)).map(
    (threshold) =>
      Math.min(Math.max(audioLevel - threshold, 0) / (1 / leds), 1),
  );

  useEffect(() => {
    if (audioContext.current) {
      audioContext.current.close();
      audioContext.current = null;
      setVolume(0);
      setHighestVolume(0);
    }

    if (stream !== null) {
      try {
        monitorVolume(stream);
      } catch (ex: unknown) {
        // Do nothing.
      }
    }
  }, [stream]);

  function easeOutCubic(x: number) {
    return 1 - Math.pow(1 - x, 3);
  }

  async function monitorVolume(stream: MediaStream) {
    audioContext.current = new AudioContext();

    await audioContext.current.audioWorklet.addModule(PROCESSOR_MODULE);
    const microphone = audioContext.current.createMediaStreamSource(stream);
    const node = new AudioWorkletNode(audioContext.current, WORKLET_NAME);

    node.port.onmessage = (message) => {
      const volume = message.data.volume ?? 0;

      setVolume(volume);
      if (volume > highestVolume) {
        setHighestVolume((highest) => (volume > highest ? volume : highest));
      }
    };

    microphone.connect(node).connect(audioContext.current.destination);
  }

  return (
    <div className="h-full flex flex-col justify-center gap-px">
      {ledLevels.reverse().map((led, i) => (
        <div
          key={i}
          className={clsx(
            "w-[5px] h-[3px] min-h-px",
            "transition-all duration-150 ease-out",
            led == 0
              ? "bg-zinc-200 dark:bg-zinc-900"
              : led < 0.3
                ? "bg-red-100 dark:bg-red-900"
                : led < 0.6
                  ? "bg-red-300 dark:bg-red-700"
                  : "bg-red-500",
          )}
        />
      ))}
    </div>
  );
};
