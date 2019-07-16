#if defined(UNICODE) && !defined(_UNICODE)
    #define _UNICODE
#elif defined(_UNICODE) && !defined(UNICODE)
    #define UNICODE
#endif

#define CHROME_PATH "chrome\\chrome.exe"
#define CHROME_CLI ".\\##CHROME_PATH## --user-data-dir=userdata"


#include <tchar.h>
#include <windows.h>


BOOL WriteRegistryPolicies();
BOOL StartupChromium();


int WINAPI WinMain (HINSTANCE hThisInstance,
                    HINSTANCE hPrevInstance,
                    LPSTR lpszArgument,
                    int nCmdShow)
{
    if (!WriteRegistryPolicies()) {
        MessageBox(GetDesktopWindow(),
                   _T("无法写入注册表策略配置。"),
                   _T("错误"),
                   MB_OK | MB_ICONERROR);
    }

    if (!StartupChromium())
    {
        TCHAR lpszMessage[100];
        wsprintf(lpszMessage, _T("找不到程序 %s。"), _T(CHROME_PATH));
        MessageBox(GetDesktopWindow(),
                   lpszMessage,
                   _T("错误"),
                   MB_OK | MB_ICONERROR);
    }
	return 0;
}


BOOL WriteRegistryPolicies()
{
    HKEY hKeyChromium, hKeyExtensionInstallForcelist, hKeyExtensionInstallSources;
    if (ERROR_SUCCESS != RegCreateKeyEx(HKEY_CURRENT_USER,
                                        _T("SOFTWARE\\Policies\\Chromium"),
                                        0,
                                        NULL,
                                        REG_OPTION_NON_VOLATILE,
                                        KEY_ALL_ACCESS,
                                        NULL,
                                        &hKeyChromium,
                                        NULL))
    {
        return FALSE;
    }

    if (ERROR_SUCCESS != RegCreateKeyEx(HKEY_CURRENT_USER,
                                        _T("SOFTWARE\\Policies\\Chromium\\ExtensionInstallForcelist"),
                                        0,
                                        NULL,
                                        REG_OPTION_NON_VOLATILE,
                                        KEY_ALL_ACCESS,
                                        NULL,
                                        &hKeyExtensionInstallForcelist,
                                        NULL))
    {
        return FALSE;
    }

    if (ERROR_SUCCESS != RegCreateKeyEx(HKEY_CURRENT_USER,
                                        _T("SOFTWARE\\Policies\\Chromium\\ExtensionInstallSources"),
                                        0,
                                        NULL,
                                        REG_OPTION_NON_VOLATILE,
                                        KEY_ALL_ACCESS,
                                        NULL,
                                        &hKeyExtensionInstallSources,
                                        NULL))
    {
        return FALSE;
    }
    return TRUE;
}


BOOL StartupChromium()
{
	STARTUPINFO si;
    PROCESS_INFORMATION pi;

    ZeroMemory( &si, sizeof(si) );
    si.cb = sizeof(si);
    ZeroMemory( &pi, sizeof(pi) );

    char *lpEnvironment = "GOOGLE_API_KEY=no\0"
                          "GOOGLE_DEFAULT_CLIENT_ID=no\0"
                          "GOOGLE_DEFAULT_CLIENT_SECRET=no\0";

    return CreateProcess(NULL, _T(CHROME_CLI), NULL, NULL, FALSE, 0, (LPVOID)lpEnvironment, NULL, &si, &pi);
}
