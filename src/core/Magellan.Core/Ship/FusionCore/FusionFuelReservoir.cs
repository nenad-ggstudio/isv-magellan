namespace Ship.FusionCore;

public sealed class FusionFuelReservoir
{
    public FusionFuelReservoir(
        string fuel,
        double capacityKilograms,
        double quantityKilograms,
        double purityLevel)
    {
        Fuel = fuel;
        CapacityKilograms = capacityKilograms;
        QuantityKilograms = quantityKilograms;
        PurityLevel = purityLevel;
    }

    public string Fuel { get; }

    public double CapacityKilograms { get; }

    public double QuantityKilograms { get; }

    public double PurityLevel { get; }

    public FusionFuelReservoir Spend(double quantityKilograms)
    {
        if (!double.IsFinite(quantityKilograms)
            || quantityKilograms < 0
            || quantityKilograms > QuantityKilograms)
        {
            throw new ArgumentOutOfRangeException(nameof(quantityKilograms));
        }

        return new FusionFuelReservoir(
            Fuel,
            CapacityKilograms,
            QuantityKilograms - quantityKilograms,
            PurityLevel);
    }
}
