/// <reference types="vite/client" />

interface Window {
  Dos?: (
    element: HTMLElement,
    options: {
      url: string;
      autoStart?: boolean;
    }
  ) => unknown;
}
