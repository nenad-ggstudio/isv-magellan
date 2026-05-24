namespace Ship.FusionCore;

public sealed class CoolantTank
{
    public CoolantTank(
        string coolant,
        double capacityKilograms,
        double quantityKilograms,
        double purityLevel)
    {
        Coolant = coolant;
        CapacityKilograms = capacityKilograms;
        QuantityKilograms = quantityKilograms;
        PurityLevel = purityLevel;
    }

    public string Coolant { get; }

    public double CapacityKilograms { get; }

    public double QuantityKilograms { get; }

    public double PurityLevel { get; }
}
