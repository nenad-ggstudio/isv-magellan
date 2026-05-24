namespace Ship.BatteryBank;

public sealed class BatteryBank
{
    public BatteryBank(
        double designCapacityKilowattHours,
        double chargeLevel,
        double healthLevel)
    {
        DesignCapacityKilowattHours = designCapacityKilowattHours;
        ChargeLevel = chargeLevel;
        HealthLevel = healthLevel;
    }

    public double DesignCapacityKilowattHours { get; }

    public double MaxCapacityKilowattHours =>
        DesignCapacityKilowattHours * HealthLevel;

    public double ChargeLevel { get; }

    public double HealthLevel { get; }

    public double StoredKilowattHours => MaxCapacityKilowattHours * ChargeLevel;

    public static BatteryBank StartingBank()
    {
        return new BatteryBank(
            designCapacityKilowattHours: 5_000,
            chargeLevel: 0.74,
            healthLevel: 0.91);
    }
}
