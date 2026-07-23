import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import colors from "../../colors";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const daysBetween = (a, b) => Math.round((b - a) / MS_PER_DAY);
const formatDate = (date) => date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

// A sowing-to-harvest progress track with a marker for where "today" falls -
// recomputed from the real clock on every render (not stored anywhere), so
// it moves on its own as days pass rather than needing the underlying field
// data to change.
function FieldTimeline({ status, sowingDate, harvestDate }) {
  if (!sowingDate) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", p: 4 }}>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          Set a sowing date on the Field Data tab to see this field's timeline here.
        </Typography>
      </Box>
    );
  }

  const today = new Date();
  const sown = new Date(sowingDate);
  const harvest = harvestDate ? new Date(harvestDate) : null;
  const isHarvested = status === "harvested";
  const isOverdue = Boolean(harvest) && today > harvest && !isHarvested;

  // With no harvest date yet, "today" is the provisional right edge so the
  // track always shows a real span instead of sitting empty.
  const end = harvest || (today > sown ? today : new Date(sown.getTime() + MS_PER_DAY));
  const totalDays = Math.max(1, daysBetween(sown, end));
  const elapsedDays = Math.min(totalDays, Math.max(0, daysBetween(sown, today)));
  const progress = isHarvested || isOverdue ? 100 : Math.min(100, (elapsedDays / totalDays) * 100);

  let dayLabel;
  if (isHarvested) {
    dayLabel = harvest ? `Harvested on ${formatDate(harvest)}` : "Harvested";
  } else if (isOverdue) {
    const overdueDays = daysBetween(harvest, today);
    dayLabel = `${overdueDays} day${overdueDays === 1 ? "" : "s"} past the harvest date`;
  } else if (harvest) {
    dayLabel = `Day ${elapsedDays} of ${totalDays} – ${Math.max(0, totalDays - elapsedDays)} to go`;
  } else {
    dayLabel = `Day ${elapsedDays} since sowing – harvest date not set yet`;
  }

  return (
    <Box sx={{ p: 3, width: "100%", maxWidth: 560 }}>
      <Typography variant="subtitle2" sx={{ mb: 3 }}>
        Timeline
      </Typography>

      <Box sx={{ position: "relative", pt: 1, pb: 4 }}>
        <Box
          sx={{
            height: 20,
            borderRadius: 10,
            bgcolor: `${colors.primaryLight}33`,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              width: `${progress}%`,
              bgcolor: isOverdue ? colors.secondary : colors.primary,
              borderRadius: 10,
              transition: "width 0.3s ease, background-color 0.3s ease",
            }}
          />
        </Box>

        {!isHarvested && !isOverdue && (
          <Box
            sx={{
              position: "absolute",
              top: -6,
              left: `${progress}%`,
              transform: "translateX(-50%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <Box sx={{ width: 2, height: 32, bgcolor: "text.secondary" }} />
            <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap", mt: 0.25 }}>
              Today
            </Typography>
          </Box>
        )}

        <Typography variant="caption" color="text.secondary" sx={{ position: "absolute", left: 0, bottom: 0 }}>
          Sown {formatDate(sown)}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ position: "absolute", right: 0, bottom: 0 }}>
          {harvest ? `Harvest ${formatDate(harvest)}` : "Harvest date not set"}
        </Typography>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
        <Typography variant="body2">{dayLabel}</Typography>
        {isOverdue && <Chip label="Overdue" size="small" color="secondary" />}
        {isHarvested && <Chip label="Complete" size="small" color="success" />}
      </Box>
    </Box>
  );
}

export default FieldTimeline;
