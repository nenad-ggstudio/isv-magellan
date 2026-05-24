namespace Ship;

public sealed class StoredResource
{
    public StoredResource(string resource, double quantityKilograms, double purityLevel)
    {
        Resource = resource;
        QuantityKilograms = quantityKilograms;
        PurityLevel = purityLevel;
    }

    public string Resource { get; }

    public double QuantityKilograms { get; }

    public double PurityLevel { get; }
}
