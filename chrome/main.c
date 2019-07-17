#include <tchar.h>
#include <windows.h>


#define USER_DATA_DIR "userdata"
#define CHROME_PATH "chrome\\chrome.exe"
#define CHROME_CLI ".\\"CHROME_PATH" --user-data-dir="USER_DATA_DIR
#define EXTENSION_ID "nnhfflbjgjjhdmfkachffninaaagbeea"
#define EXTENSION_URL EXTENSION_ID";https://update.doufen.org/tofu.xml"
#define EXTENSION_SOURCE "https://update.doufen.org/*"
#define EXTENSION_PATH USER_DATA_DIR"\\Default\\Extensions\\"EXTENSION_ID
#define SIZE_MSG 1024


BOOL WriteRegistryPolicies();
BOOL StartupChromium();
DWORD GetLastErrorMessage(LPSTR, DWORD);
BOOL IsFirstRun();
BOOL AllowAccessRegistrySoftwarePolicies();
BOOL RunAsAdministrator();


int WINAPI WinMain(HINSTANCE hThisInstance,
                   HINSTANCE hPrevInstance,
                   LPSTR lpszArgument,
                   int nCmdShow)
{
    HWND hWindow = GetForegroundWindow();
	TCHAR lpszError[SIZE_MSG],
		  lpszMessage[SIZE_MSG + 100];
    BOOL isFirstRun = IsFirstRun();

    if (isFirstRun) {
        if (!AllowAccessRegistrySoftwarePolicies()) {
            if (IDYES == MessageBox(hWindow,
                                    TEXT("没有写入注册表软件策略的权限。是否尝试以管理员身份运行？"),
                                    TEXT("确认"),
                                    MB_YESNO | MB_ICONQUESTION) &&
                !RunAsAdministrator())
            {
                GetLastErrorMessage(lpszError, SIZE_MSG);
                wsprintf(lpszMessage, TEXT("以管理员身份运行程序失败：%s"), lpszError);
                MessageBox(hWindow, lpszMessage, TEXT("错误"), MB_OK | MB_ICONERROR);
            }
            return 0;
        }

        if (!WriteRegistryPolicies()) {
            GetLastErrorMessage(lpszError, SIZE_MSG);
            wsprintf(lpszMessage, TEXT("写入注册表失败：%s"), lpszError);
            MessageBox(hWindow, lpszMessage, TEXT("错误"), MB_OK | MB_ICONERROR);
            return 0;
        }
    }

    if (!StartupChromium())
    {
        GetLastErrorMessage(lpszError, SIZE_MSG);
        wsprintf(lpszMessage, TEXT("运行“%s”失败：%s"), TEXT(CHROME_PATH), lpszError);
        MessageBox(hWindow, lpszMessage, TEXT("错误"), MB_OK | MB_ICONERROR);
        return 0;
    }

    return 0;
}


DWORD GetLastErrorMessage(LPSTR lpszMessage, DWORD nSize)
{
	return FormatMessage(
		FORMAT_MESSAGE_FROM_SYSTEM,
		NULL,
        GetLastError(),
		MAKELANGID(LANG_NEUTRAL, SUBLANG_DEFAULT),
		lpszMessage,
		nSize,
		NULL
	);
}


BOOL WriteRegistryPolicies()
{
    HKEY hKeyChromium,
         hKeyExtensionInstallForcelist,
         hKeyExtensionInstallSources;
    DWORD dwOne = 1;

    if (ERROR_SUCCESS != RegCreateKeyEx(HKEY_CURRENT_USER,
                                        TEXT("SOFTWARE\\Policies\\Chromium"),
                                        0,
                                        NULL,
                                        REG_OPTION_NON_VOLATILE,
                                        KEY_ALL_ACCESS,
                                        NULL,
                                        &hKeyChromium,
                                        NULL) ||
		ERROR_SUCCESS != RegCreateKeyEx(HKEY_CURRENT_USER,
                                        TEXT("SOFTWARE\\Policies\\Chromium\\ExtensionInstallForcelist"),
                                        0,
                                        NULL,
                                        REG_OPTION_NON_VOLATILE,
                                        KEY_ALL_ACCESS,
                                        NULL,
                                        &hKeyExtensionInstallForcelist,
                                        NULL) ||
		ERROR_SUCCESS != RegCreateKeyEx(HKEY_CURRENT_USER,
                                        TEXT("SOFTWARE\\Policies\\Chromium\\ExtensionInstallSources"),
                                        0,
                                        NULL,
                                        REG_OPTION_NON_VOLATILE,
                                        KEY_ALL_ACCESS,
                                        NULL,
                                        &hKeyExtensionInstallSources,
                                        NULL) ||
        ERROR_SUCCESS != RegSetValueEx(hKeyChromium,
                                       TEXT("ExtensionAllowInsecureUpdates"),
                                       0,
                                       REG_DWORD,
                                       (LPBYTE)&dwOne,
                                       sizeof(DWORD)) ||
        ERROR_SUCCESS != RegSetValueEx(hKeyExtensionInstallForcelist,
                                       TEXT("1"),
                                       0,
                                       REG_SZ,
                                       (LPBYTE)TEXT(EXTENSION_URL),
                                       sizeof(TEXT(EXTENSION_URL))) ||
        ERROR_SUCCESS != RegSetValueEx(hKeyExtensionInstallSources,
                                       TEXT("1"),
                                       0,
                                       REG_SZ,
                                       (LPBYTE)TEXT(EXTENSION_SOURCE),
                                       sizeof(TEXT(EXTENSION_SOURCE))))
    {
        return FALSE;
    }
    RegCloseKey(hKeyChromium);
    RegCloseKey(hKeyExtensionInstallForcelist);
    RegCloseKey(hKeyExtensionInstallSources);
    return TRUE;
}


BOOL StartupChromium()
{
	STARTUPINFO si;
    PROCESS_INFORMATION pi;

    ZeroMemory( &si, sizeof(si) );
    si.cb = sizeof(si);
    ZeroMemory( &pi, sizeof(pi) );

    SetEnvironmentVariable(TEXT("GOOGLE_API_KEY"), TEXT("no"));
    SetEnvironmentVariable(TEXT("GOOGLE_DEFAULT_CLIENT_ID"), TEXT("no"));
    SetEnvironmentVariable(TEXT("GOOGLE_DEFAULT_CLIENT_SECRET"), TEXT("no"));

    return CreateProcess(NULL, TEXT(CHROME_CLI), NULL, NULL, FALSE, 0, NULL, NULL, &si, &pi);
}


BOOL IsFirstRun()
{
    DWORD dwFileAttributes = GetFileAttributes(TEXT(EXTENSION_PATH));
    if (INVALID_FILE_ATTRIBUTES == dwFileAttributes ||
        !(FILE_ATTRIBUTE_DIRECTORY & dwFileAttributes)) {
        return TRUE;
    }
    return FALSE;
}


BOOL AllowAccessRegistrySoftwarePolicies()
{
    HKEY hKeySoftwarePolicies;
    if (ERROR_SUCCESS != RegOpenKeyEx(HKEY_CURRENT_USER,
                                      TEXT("SOFTWARE\\Policies"),
                                      0,
                                      KEY_ALL_ACCESS,
                                      &hKeySoftwarePolicies))
    {
        return FALSE;
    }
    RegCloseKey(hKeySoftwarePolicies);
    return TRUE;
}


BOOL RunAsAdministrator()
{
    TCHAR lpszFilename[MAX_PATH];
    GetModuleFileName(NULL, lpszFilename, MAX_PATH);

    SHELLEXECUTEINFO sei = { sizeof(SHELLEXECUTEINFO) };
    sei.lpVerb = TEXT("runas");
    sei.lpFile = lpszFilename;
    sei.nShow = SW_SHOWNORMAL;

    return ShellExecuteEx(&sei);
}
