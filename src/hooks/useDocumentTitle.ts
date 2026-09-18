import { useEffect } from "react";

/** Title restored when a page that set its own title unmounts. */
export const DEFAULT_TITLE = "PRESS START";

/** Sets `document.title` while the component is mounted. */
export const useDocumentTitle = (title: string): void => {
  useEffect(() => {
    document.title = title;
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [title]);
};
