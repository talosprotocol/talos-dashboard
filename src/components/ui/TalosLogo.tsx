import React from 'react';
import Image from 'next/image';
import { cn } from "@/lib/cn";

interface TalosLogoProps {
    className?: string;
    variant?: 'dark' | 'light';
    width?: number;
    height?: number;
}

export const TalosLogo: React.FC<TalosLogoProps> = ({
    className = "",
    variant = 'dark',
    width = 32,
    height = 32
}) => {
    const src = variant === 'dark' ? '/logo-dark.png' : '/logo-light.png';

    return (
        <div className={cn("relative", className)} style={{ width, height }}>
            <Image
                src={src}
                alt="Talos Protocol"
                fill
                sizes="32px"
                className="object-contain"
                priority
            />
        </div>
    );
};
