using ShipBatteryBank = Ship.BatteryBank.BatteryBank;
using ShipFusionCore = Ship.FusionCore.FusionCore;

namespace Ship;

public sealed class Ship
{
    public Ship(
        string name,
        IReadOnlyList<StorageUnit> storageUnits,
        ShipFusionCore fusionCore,
        ShipBatteryBank batteryBank)
    {
        Name = name;
        StorageUnits = storageUnits;
        FusionCore = fusionCore;
        BatteryBank = batteryBank;
    }

    public string Name { get; }

    public IReadOnlyList<StorageUnit> StorageUnits { get; }

    public ShipFusionCore FusionCore { get; }

    public ShipBatteryBank BatteryBank { get; }

    public static Ship StartingShip()
    {
        return new Ship(
            "ISV Magellan",
            [
                new StorageUnit(
                    1,
                    100,
                    new StoredResource("water", 72, 0.96)),
                new StorageUnit(
                    2,
                    100,
                    new StoredResource("water", 48, 0.94)),
                new StorageUnit(
                    3,
                    100,
                    new StoredResource("lithium", 22, 0.98)),
                new StorageUnit(
                    4,
                    100,
                    new StoredResource("carbon", 61, 0.99)),
                new StorageUnit(5, 100, null),
                new StorageUnit(6, 100, null),
                new StorageUnit(7, 100, null),
                new StorageUnit(8, 100, null),
                new StorageUnit(9, 100, null),
                new StorageUnit(10, 100, null)
            ],
            ShipFusionCore.StartingCore(),
            ShipBatteryBank.StartingBank());
    }
}
