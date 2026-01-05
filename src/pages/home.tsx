import React, { useEffect, useState } from "react";

const Home: React.FC = () => {
  const bgUrl = "/others/bg.gif";
  const [started] = useState(() => window.location.pathname === "/home");
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    document.title = started ? "SURPRISE" : "PRESS START";
  }, [started]);

  const handleStart = () => {
    // navigate to /home so the URL shows the started view
    if (!started) {
      window.location.href = "/games";
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement | HTMLAnchorElement>
  ) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleStart();
    }
  };

  const containerStyle: React.CSSProperties = {
    minHeight: "100vh",
    width: "100%",
    backgroundImage: `url(${bgUrl})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
  };

  const menuStyle: React.CSSProperties = {
    marginTop: 32,
    display: "flex",
    gap: 48,
    alignItems: "flex-start",
  };

  return (
    <div style={containerStyle}>
      {!started && (
        <button
          aria-pressed={started}
          onClick={handleStart}
          onMouseDown={() => setPressed(true)}
          onMouseUp={() => setPressed(false)}
          onMouseLeave={() => setPressed(false)}
          onKeyDown={handleKeyDown}
          style={{
            background: "transparent",
            border: "none",
            padding: 0,
            cursor: "pointer",
            display: "inline-block",
            transform: pressed ? "translate(6px,6px)" : undefined,
            transition: "transform 60ms linear",
            WebkitTapHighlightColor: "transparent",
          }}
          aria-label="Press Start"
        >
          <img
            src="/images/start.png"
            alt="Start"
            width={320}
            draggable={false}
            style={{
              display: "block",
              width: 320,
              height: "auto",
              imageRendering: "pixelated",
              WebkitUserSelect: "none",
              userSelect: "none",
              pointerEvents: "none",
            }}
          />
        </button>
      )}

      {started && (
        <>
          <img
            src="/images/back.png"
            alt="Back"
            role="button"
            aria-label="Back"
            tabIndex={0}
            draggable={false}
            onClick={() => { window.location.href = "/"; }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                window.location.href = "/";
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

          <div style={menuStyle}>
            <a
              href="/message"
              onKeyDown={handleKeyDown}
              role="button"
              aria-label="Message"
              style={{ textDecoration: "none" }}
            >
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <img
                  src="/others/book.gif"
                  alt="Book"
                  draggable={false}
                  style={{
                    display: "block",
                    width: 140,
                    padding: "70px 40px 0 40px",
                    height: "auto",
                    imageRendering: "pixelated",
                    WebkitUserSelect: "none",
                    userSelect: "none",
                  }}
                />
                <img
                  src="/images/message.png"
                  alt="Message"
                  draggable={false}
                  style={{
                    display: "block",
                    width: 300,
                    height: "auto",
                    imageRendering: "pixelated",
                    WebkitUserSelect: "none",
                    userSelect: "none",
                  }}
                />
              </div>
            </a>
            
            <a
              href="/games"
              onKeyDown={handleKeyDown}
              role="button"
              aria-label="Games"
              style={{ textDecoration: "none" }}
            >
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <img
                  src="/others/game.gif"
                  alt="Games"
                  draggable={false}
                  style={{
                    display: "block",
                    width: 200,
                    height: "auto",
                    imageRendering: "pixelated",
                    WebkitUserSelect: "none",
                    userSelect: "none",
                  }}
                />
                <img
                  src="/images/play.png"
                  alt="Play"
                  draggable={false}
                  style={{
                    display: "block",
                    width: 300,
                    height: "auto",
                    imageRendering: "pixelated",
                    WebkitUserSelect: "none",
                    userSelect: "none",
                  }}
                />
              </div>
            </a>

          </div>
        </>
      )}
    </div>
  );
};

export default Home;
