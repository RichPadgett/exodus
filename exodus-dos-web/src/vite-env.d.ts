/// <reference types="vite/client" />

interface DosController {
  save: () => Promise<void> | void;
  stop: () => Promise<void> | void;
  setFullScreen: (enabled: boolean) => void;
}

interface Window {
  Dos?: (
    element: HTMLElement,
    options: {
      url: string;
      autoStart?: boolean;
    }
  ) => DosController;
}
