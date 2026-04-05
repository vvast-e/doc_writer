import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";

type PickerKind = "file" | "folder" | "chromeExe";

export function useFilePicker(kind: PickerKind) {
  const [isPicking, setIsPicking] = useState(false);

  const pick = async (): Promise<string | null> => {
    setIsPicking(true);
    try {
      if (kind === "folder") {
        const selected = await open({
          directory: true,
        });
        return typeof selected === "string" ? selected : null;
      }
      const filters =
        kind === "chromeExe"
          ? [{ name: "chrome.exe", extensions: ["exe"] }]
          : [{ name: "Text files", extensions: ["txt"] }];
      const selected = await open({
        multiple: false,
        filters,
      });
      return typeof selected === "string" ? selected : null;
    } catch (error) {
      console.error(error);
      return null;
    } finally {
      setIsPicking(false);
    }
  };

  return { isPicking, pick };
}

