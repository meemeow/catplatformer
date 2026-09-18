interface FadeOverlayProps {
  visible: boolean;
  /** 0 = fully transparent, 1 = fully black. */
  opacity: number;
}

/** Full-screen black curtain used for every scene transition. */
export const FadeOverlay = ({ visible, opacity }: FadeOverlayProps) => {
  if (!visible) return null;
  return <div className="fade-overlay" style={{ opacity }} />;
};
