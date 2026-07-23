import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";

// The one close-button style/position/behavior used by every modal in the
// app: a circular button sitting at the top-left edge, always closing on
// click. `floating` (default) overlaps the modal's border like a badge -
// for centered dialogs that have a visible edge to sit on. Fullscreen
// dialogs and small map popups have no border to float outside of, so
// their header passes floating={false} to sit just inside the corner
// instead - same circle, same spot, same click behavior either way.
export default function ModalCloseButton({ onClick, floating = true, sx, ...props }) {
  return (
    <IconButton
      onClick={onClick}
      aria-label="Close"
      size="small"
      sx={{
        position: "absolute",
        top: floating ? -14 : 6,
        left: floating ? -14 : 6,
        zIndex: 1,
        bgcolor: "background.paper",
        boxShadow: 3,
        "&:hover": { bgcolor: "background.paper", opacity: 0.9 },
        ...sx,
      }}
      {...props}
    >
      <CloseIcon fontSize="small" />
    </IconButton>
  );
}
