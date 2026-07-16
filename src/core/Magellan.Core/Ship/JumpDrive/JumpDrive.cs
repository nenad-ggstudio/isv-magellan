using World;
using ShipFusionCore = Ship.FusionCore.FusionCore;

namespace Ship.JumpDrive;

public sealed class JumpDrive
{
    public JumpDrive(
        string id,
        string label,
        double maximumDistanceLightYears,
        double deuteriumIgnitionCostKilograms,
        double deuteriumTravelCostKilogramsPerLightYear,
        double tritiumIgnitionCostKilograms,
        double tritiumTravelCostKilogramsPerLightYear)
    {
        Id = id;
        Label = label;
        MaximumDistanceLightYears = maximumDistanceLightYears;
        DeuteriumIgnitionCostKilograms = deuteriumIgnitionCostKilograms;
        DeuteriumTravelCostKilogramsPerLightYear =
            deuteriumTravelCostKilogramsPerLightYear;
        TritiumIgnitionCostKilograms = tritiumIgnitionCostKilograms;
        TritiumTravelCostKilogramsPerLightYear =
            tritiumTravelCostKilogramsPerLightYear;
    }

    public string Id { get; }

    public string Label { get; }

    public double MaximumDistanceLightYears { get; }

    public double DeuteriumIgnitionCostKilograms { get; }

    public double DeuteriumTravelCostKilogramsPerLightYear { get; }

    public double TritiumIgnitionCostKilograms { get; }

    public double TritiumTravelCostKilogramsPerLightYear { get; }

    public JumpQuote? CreateQuote(
        GameWorld world,
        ShipFusionCore fusionCore,
        double targetX,
        double targetY)
    {
        var map = world.JumpAreaMap;

        if (!double.IsFinite(targetX)
            || !double.IsFinite(targetY)
            || targetX < 0
            || targetX > map.Width
            || targetY < 0
            || targetY > map.Height)
        {
            return null;
        }

        var centerX = map.Width / 2;
        var centerY = map.Height / 2;
        var distance = DistanceBetween(centerX, centerY, targetX, targetY);

        if (distance <= JumpConstants.MinimumDistanceLightYears
            || distance > MaximumDistanceLightYears)
        {
            return null;
        }

        var deuteriumCost = DeuteriumIgnitionCostKilograms
            + (distance * DeuteriumTravelCostKilogramsPerLightYear);
        var tritiumCost = TritiumIgnitionCostKilograms
            + (distance * TritiumTravelCostKilogramsPerLightYear);
        var canAfford =
            fusionCore.DeuteriumReservoir.QuantityKilograms >= deuteriumCost
            && fusionCore.TritiumReservoir.QuantityKilograms >= tritiumCost;

        return new JumpQuote(
            world.ShipPosition.X,
            world.ShipPosition.Y,
            targetX,
            targetY,
            distance,
            deuteriumCost,
            tritiumCost,
            canAfford);
    }

    public static JumpDrive StartingDrive()
    {
        return new JumpDrive(
            "jump-drive",
            "Jump Drive",
            JumpConstants.MaximumDistanceLightYears,
            JumpConstants.DeuteriumIgnitionCostKilograms,
            JumpConstants.DeuteriumTravelCostKilogramsPerLightYear,
            JumpConstants.TritiumIgnitionCostKilograms,
            JumpConstants.TritiumTravelCostKilogramsPerLightYear);
    }

    private static double DistanceBetween(double x1, double y1, double x2, double y2)
    {
        var deltaX = x2 - x1;
        var deltaY = y2 - y1;

        return Math.Sqrt((deltaX * deltaX) + (deltaY * deltaY));
    }
}
