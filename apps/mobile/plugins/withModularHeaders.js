/**
 * Expo config plugin to add modular headers for GoogleUtilities
 * in the Podfile, fixing the FirebaseCoreInternal Swift module error.
 */
const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withModularHeaders(config) {
    return withDangerousMod(config, [
        'ios',
        (config) => {
            const podfilePath = path.join(
                config.modRequest.platformProjectRoot,
                'Podfile'
            );

            if (fs.existsSync(podfilePath)) {
                let podfileContents = fs.readFileSync(podfilePath, 'utf8');

                // Add modular headers for GoogleUtilities right after 'use_frameworks!' or at the top of the target block
                if (!podfileContents.includes("pod 'GoogleUtilities', :modular_headers => true")) {
                    // Insert after the first 'target' line
                    podfileContents = podfileContents.replace(
                        /^(target\s+'[^']+'\s+do)/m,
                        `$1\n  pod 'GoogleUtilities', :modular_headers => true\n  pod 'FirebaseCore', :modular_headers => true\n  pod 'FirebaseCoreInternal', :modular_headers => true\n  pod 'FirebaseInstallations', :modular_headers => true\n  pod 'GoogleAppMeasurement', :modular_headers => true\n  pod 'nanopb', :modular_headers => true\n  pod 'PromisesObjC', :modular_headers => true`
                    );

                    fs.writeFileSync(podfilePath, podfileContents, 'utf8');
                }
            }

            return config;
        },
    ]);
}

module.exports = withModularHeaders;
