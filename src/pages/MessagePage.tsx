import { IMAGES } from "../game/assets";
import { BackButton } from "../components/ui/BackButton";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { ROUTES } from "../app/routes";

import "../styles/pages/message.css";

/** A single illustrated page; the Christmas note this project was built for. */
const MessagePage = () => {
  useDocumentTitle("Christmas Message");

  return (
    <div className="screen">
      <BackButton href={ROUTES.home} />
      <img
        src={IMAGES.bookMessage}
        alt="Book Message"
        draggable={false}
        className="message-page__book pixel"
      />
    </div>
  );
};

export default MessagePage;
