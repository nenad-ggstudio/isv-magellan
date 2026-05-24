namespace Ship;

public sealed class StorageUnit
{
    public StorageUnit(
        int slotNumber,
        double capacityKilograms,
        StoredResource? contents)
    {
        SlotNumber = slotNumber;
        CapacityKilograms = capacityKilograms;
        Contents = contents;
    }

    public int SlotNumber { get; }

    public double CapacityKilograms { get; }

    public StoredResource? Contents { get; }
}
