import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import { alpha, useTheme } from "@mui/material/styles";
import { estimateMaterials } from "../../libs/materialsEstimate.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const daysBetween = (a, b) => Math.round((b - a) / MS_PER_DAY);
const formatDate = (date) => date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
const formatNumber = (n) => Math.round(n).toLocaleString();

// A sowing-to-harvest progress track with a marker for where "today" falls,
// plus a materials estimate below it - both recomputed from the real clock
// on every render (not stored anywhere), so they move on their own as days
// pass rather than needing the underlying field data to change.
function FieldTimeline({ status, sowingDate, harvestDate, variety, areaM2, totalCapacity, varieties = [] }) {
  const theme = useTheme();
  const today = new Date();
  const sown = sowingDate ? new Date(sowingDate) : null;
  const harvest = harvestDate ? new Date(harvestDate) : null;
  const isHarvested = status === "harvested";
  const isOverdue = Boolean(sown) && Boolean(harvest) && today > harvest && !isHarvested;

  // 1 = nothing consumed yet (not sown, or planning ahead), 0 = season
  // effectively over, null = no harvest date to measure progress against
  // (so there's no season length to prorate - the estimate below falls
  // back to a total-only figure in that case).
  let remainingFraction = 1;
  if (isHarvested || isOverdue) {
    remainingFraction = 0;
  } else if (sown && !harvest) {
    remainingFraction = null;
  } else if (sown && harvest) {
    const totalDays = Math.max(1, daysBetween(sown, harvest));
    const elapsedDays = Math.min(totalDays, Math.max(0, daysBetween(sown, today)));
    remainingFraction = Math.max(0, 1 - elapsedDays / totalDays);
  }

  const materials = estimateMaterials({ variety, areaM2, totalCapacity, remainingFraction, varieties });

  let ganttSection;
  if (!sown) {
    ganttSection = (
      <Typography variant="body2" color="text.secondary">
        Set a sowing date on the Field Data tab to see this field's timeline here.
      </Typography>
    );
  } else {
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

    ganttSection = (
      <>
        <Box sx={{ position: "relative", pt: 1, pb: 4 }}>
          <Box
            sx={{
              height: 20,
              borderRadius: 10,
              bgcolor: alpha(theme.palette.primary.light, 0.2),
              position: "relative",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                width: `${progress}%`,
                bgcolor: isOverdue ? theme.palette.secondary.main : theme.palette.primary.main,
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
      </>
    );
  }

  return (
    <Box sx={{ p: 3, width: "100%", maxWidth: 560 }}>
      <Typography variant="subtitle2" sx={{ mb: 3 }}>
        Timeline
      </Typography>
      {ganttSection}

      {materials && (
        <>
          <Divider sx={{ my: 3 }} />
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
            Estimated materials{remainingFraction === 0 ? "" : " to finish the season"}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
            Rough planning figures from general horticultural guidelines for {variety || "this crop"} - not a
            precise recommendation; actual needs vary with soil, climate, and irrigation method.
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="body2" color="text.secondary">
                Seeds ({materials.seedUnit})
              </Typography>
              <Typography variant="body2">{formatNumber(materials.seeds)}</Typography>
            </Box>

            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="body2" color="text.secondary">
                Water
              </Typography>
              <Typography variant="body2">
                {materials.remainingWaterLiters == null
                  ? `~${formatNumber(materials.totalWaterLiters)} L (full season)`
                  : `${formatNumber(materials.remainingWaterLiters)} L of ~${formatNumber(
                      materials.totalWaterLiters
                    )} L (season)`}
              </Typography>
            </Box>

            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="body2" color="text.secondary">
                Fertilizer
              </Typography>
              <Typography variant="body2">
                {materials.remainingFertilizerKg == null
                  ? `~${materials.totalFertilizerKg} kg (full season)`
                  : `${materials.remainingFertilizerKg} kg of ~${materials.totalFertilizerKg} kg (season)`}
              </Typography>
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
}

export default FieldTimeline;
