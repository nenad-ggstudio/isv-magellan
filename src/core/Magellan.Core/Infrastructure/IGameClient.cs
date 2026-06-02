using Ship.BatteryBank;
using Ship.Scanners;

namespace Infrastructure;

public interface IGameClient
{
    Task GameStateChanged(GameState state);

    Task GameTick(GameTick tick);

    Task BatteryBankChanged(BatteryBank batteryBank);

    Task GravityScannerChanged(GravityScanner gravityScanner);

    Task EmScannerChanged(EmScanner emScanner);
}
