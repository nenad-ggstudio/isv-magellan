using ShipBatteryBank = Ship.BatteryBank.BatteryBank;
using ShipFusionCore = Ship.FusionCore.FusionCore;
using ShipScanners = Ship.Scanners.ShipScanners;
using ShipJumpDrive = Ship.JumpDrive.JumpDrive;

namespace Ship;

public sealed class Ship
{
    public Ship(
        string name,
        IReadOnlyList<StorageUnit> storageUnits,
        ShipFusionCore fusionCore,
        ShipBatteryBank batteryBank,
        ShipScanners scanners,
        ShipJumpDrive? jumpDrive = null)
    {
        Name = name;
        StorageUnits = storageUnits;
        FusionCore = fusionCore;
        BatteryBank = batteryBank;
        Scanners = scanners;
        JumpDrive = jumpDrive ?? ShipJumpDrive.StartingDrive();
    }

    public string Name { get; }

    public IReadOnlyList<StorageUnit> StorageUnits { get; }

    public ShipFusionCore FusionCore { get; }

    public ShipBatteryBank BatteryBank { get; }

    public ShipScanners Scanners { get; }

    public ShipJumpDrive JumpDrive { get; }

    public Ship WithScanners(ShipScanners scanners)
    {
        return new Ship(
            Name,
            StorageUnits,
            FusionCore,
            BatteryBank,
            scanners,
            JumpDrive);
    }

    public Ship WithBatteryBank(ShipBatteryBank batteryBank)
    {
        return new Ship(
            Name,
            StorageUnits,
            FusionCore,
            batteryBank,
            Scanners,
            JumpDrive);
    }

    public Ship WithFusionCore(ShipFusionCore fusionCore)
    {
        return new Ship(
            Name,
            StorageUnits,
            fusionCore,
            BatteryBank,
            Scanners,
            JumpDrive);
    }

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
            ShipBatteryBank.StartingBank(),
            ShipScanners.StartingScanners(),
            ShipJumpDrive.StartingDrive());
    }
}
