namespace Ship.FusionCore;

public sealed class FusionCore
{
    public FusionCore(
        FusionFuelReservoir deuteriumReservoir,
        FusionFuelReservoir tritiumReservoir,
        CoolantTank coolantTank)
    {
        DeuteriumReservoir = deuteriumReservoir;
        TritiumReservoir = tritiumReservoir;
        CoolantTank = coolantTank;
    }

    public FusionFuelReservoir DeuteriumReservoir { get; }

    public FusionFuelReservoir TritiumReservoir { get; }

    public CoolantTank CoolantTank { get; }

    public FusionCore SpendJumpFuel(
        double deuteriumKilograms,
        double tritiumKilograms)
    {
        return new FusionCore(
            DeuteriumReservoir.Spend(deuteriumKilograms),
            TritiumReservoir.Spend(tritiumKilograms),
            CoolantTank);
    }

    public static FusionCore StartingCore()
    {
        return new FusionCore(
            new FusionFuelReservoir("deuterium", 100, 86, 0.97),
            new FusionFuelReservoir("tritium", 100, 64, 0.95),
            new CoolantTank("water", 10_000, 7_600, 0.92));
    }
}
