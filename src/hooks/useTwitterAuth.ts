import { PublicKey } from "@solana/web3.js";
import { useState, useCallback, useEffect } from "react";
import { toast } from "react-hot-toast";
import { TwitterAuthState } from "src/types/Twitterauth";

export const useTwitterAuth = (publicKey: PublicKey | null) => {
    const [twitterAuth, setTwitterAuth] = useState<TwitterAuthState>({
        isLinked: false
    });

    const checkTwitterStatus = useCallback(async () => {
        if (!publicKey) return;
        
        try {
            const response = await fetch(`/api/auth/twitter/status?wallet=${publicKey.toString()}`);
            const data = await response.json();
            setTwitterAuth({ isLinked: data.isLinked });
        } catch (error) {
            console.error('Failed to check Twitter status:', error);
            setTwitterAuth({ isLinked: false });
        }
    }, [publicKey]);

    const handleTwitterAuth = async () => {
        try {
            if (!publicKey) {
                toast.error('Please connect your wallet first');
                return;
            }

            // Show loading toast
            const loadingToast = toast.loading('Connecting to Twitter...');

            // Get OAuth URL from our API
            const response = await fetch('/api/auth/twitter/authorize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    wallet: publicKey.toString(),
                    origin: window.location.origin
                })
            });

            if (!response.ok) {
                throw new Error('Failed to initiate Twitter authentication');
            }

            const { url } = await response.json();
            
            // Open Twitter auth in a popup
            const width = 600;
            const height = 600;
            const left = window.screen.width / 2 - width / 2;
            const top = window.screen.height / 2 - height / 2;
            
            const popup = window.open(
                url,
                'Twitter Auth',
                `width=${width},height=${height},left=${left},top=${top}`
            );

            // Check if popup was blocked
            if (!popup) {
                toast.error('Please allow popups for Twitter authentication', {
                    id: loadingToast
                });
                return;
            }

            // Dismiss loading toast
            toast.dismiss(loadingToast);

            // Start checking if popup closed
            const checkPopupClosed = setInterval(() => {
                if (popup.closed) {
                    clearInterval(checkPopupClosed);
                    // Always check Twitter status when popup closes
                    checkTwitterStatus();
                }
            }, 1000);

        } catch (error) {
            console.error('Twitter auth error:', error);
            toast.error('Failed to initiate Twitter authentication');
        }
    };

    useEffect(() => {
        if (publicKey) {
            checkTwitterStatus();
        }
    }, [publicKey, checkTwitterStatus]);

    return { twitterAuth, handleTwitterAuth };
}; 