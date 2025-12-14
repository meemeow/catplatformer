import React, { useEffect } from "react";

const Message: React.FC = () => {
  useEffect(() => {
    document.title = "Christmas Message";
    return () => {
      // optional: restore a default title when leaving
      document.title = "PRESS START";
    };
  }, []);
  const handleBack = () => {
    // navigate back to home
    window.location.href = "/home";
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundImage: `url(/others/bg.gif)`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        position: "relative",
      }}
    >
      <img
        src="/images/back.png"
        alt="Back"
        role="button"
        aria-label="Back"
        tabIndex={0}
        draggable={false}
        onClick={handleBack}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleBack();
          }
        }}
        style={{
          position: "fixed",
          top: 12,
          left: 12,
          width: 180,
          height: "auto",
          imageRendering: "pixelated",
          cursor: "pointer",
          zIndex: 9999,
        }}
      />

      <img
        src="/images/book_message.png"
        alt="Book Message"
        draggable={false}
        style={{
          display: "block",
          width: "60%",
          maxWidth: 580,
          height: "auto",
          imageRendering: "pixelated",
          WebkitUserSelect: "none",
          userSelect: "none",
        }}
      />
    </div>
  );
};

export default Message;
