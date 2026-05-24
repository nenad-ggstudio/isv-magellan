namespace World;

public sealed record ResourceEstimate(
    string Resource,
    double Minimum,
    double Maximum,
    string Label);
