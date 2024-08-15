/**
 * Build entry point for CDN builds.
 * You SHOULD NOT import this file except if you plan to build browser distribution of Fluid Player.
 */

import fluidPlayerInitializer from './index';

// Import CSS automatically in browser builds.
import './css/fluidplayer.min.css';

if (window) {
    /**
     * Register public interface.
     */
    if (!window.fluidPlayer) {
        window.fluidPlayer = fluidPlayerInitializer;
    }

    // Find all video tags marked as outstream and dynamically add player
    document.querySelectorAll('[data-outstream]').forEach(function (e) {
        var player = fluidPlayer(e, {
            layoutControls: {
                mute: true,
                autoPlay: true,
                controlBar: {
                    autoHideTimeout: 0.5,
                },
            },
            vastOptions: {
                skipButtonCaption: '',
                skipButtonClickCaption: '',
                adCTAText: '',
                fillToContainer: true,
                vastStatic: true,
                vastWithCredentials: false,
                outstream: true,
                adList: [
                    {
                        // Outstream is always pre roll
                        roll: 'preRoll',
                        // Fetch static VAST from tag
                        vastTag: e.dataset.outstream,
                    },
                ],
            },
        });

        // Toggle play if player is at least 50% visible
        var observer = new IntersectionObserver(
            function (entries) {
                entries.forEach(function (entry) {
                    if (entry.intersectionRatio >= 0.5) {
                        if (!self.isPlayingMedia) {
                            player.play();
                        }
                    }

                    if (entry.intersectionRatio == 0) {
                        player.pause();
                    }
                });
            },
            {
                threshold: [0.0, 0.5],
            },
        );
        observer.observe(e);
    });
}
