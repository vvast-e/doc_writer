"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { MdDownload, MdCheckCircle, MdInfo, MdPerson } from "react-icons/md";
import { FaApple, FaWindows, FaLinux } from "react-icons/fa";
import { IoMdCloseCircle } from "react-icons/io";

export default function DownloadPage() {
    const [os, setOs] = useState<"win" | "mac" | "linux" | null>(null);

    const detectOS = useCallback(() => {
        if (typeof window === "undefined") return null;
        const platform = window.navigator.platform;
        const userAgent = window.navigator.userAgent;

        if (/Mac/i.test(platform) && !/iPhone|iPad/i.test(userAgent)) {
            return "mac";
        } else if (/Linux/i.test(platform)) {
            return "linux";
        } else if (/Win/i.test(platform)) {
            return "win";
        }
        return null;
    }, []);

    useEffect(() => {
        setOs(detectOS());
    }, [detectOS]);

    const downloads = [
        {
            id: "mac",
            name: "macOS",
            sub: "Apple Silicon & Intel (.dmg)",
            icon: <FaApple className="text-3xl" />,
            color: "text-white",
            size: "45 MB",
        },
        {
            id: "win",
            name: "Windows",
            sub: "10/11 (64-bit) (.exe)",
            icon: <FaWindows className="text-3xl" />,
            color: "text-white",
            size: "38 MB",
        },
        {
            id: "linux",
            name: "Linux",
            sub: ".deb, .rpm, AppImage",
            icon: <FaLinux className="text-3xl" />,
            color: "text-white",
            size: "42 MB",
        },
    ];

    const getDownloadLink = (platform: string) => {
        console.log(platform)
        // заглушка под реальные ссылки
        return `/auth`;
    };

    return (
        <div className="flex flex-col items-center w-full py-20 px-4">
            {/* Header */}
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-6">
                <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight bg-gradient-to-r from-white to-[var(--text-muted)] bg-clip-text">
                    Скачать HumanType
                </h1>
                <div>
                    <p className="text-lg text-[var(--text-muted)]">
                        Выбери версию для своей операционной системы.
                    </p>

                    <div
                        className={`mt-3 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium border ${os
                            ? "bg-[var(--accent)]/10 border-[var(--accent)]/30 text-[var(--accent)]"
                            : "bg-[var(--primary)]/10 border-[var(--primary)]/30 text-[var(--primary)]"
                            }`}
                    >
                        {os ? (
                            <>
                                <MdCheckCircle className="text-sm" />
                                Обнаружена: {os === "mac" ? "macOS" : os === "linux" ? "Linux" : "Windows"}
                            </>
                        ) : (
                            <>
                                <IoMdCloseCircle className="text-sm" />
                                Не удалось определить ОС — выбери вариант вручную
                            </>
                        )}
                    </div>
                </div>
            </div>


            {/* Download List */}
            <div className="w-full max-w-4xl space-y-4 mb-20">
                {downloads.map((item) => {
                    const isRecommended = os === item.id;

                    return (
                        <Link
                            key={item.id}
                            href={getDownloadLink(item.id)}
                            className={`group relative flex items-center justify-between p-6 rounded-xl border transition-all duration-300 ${isRecommended
                                ? "bg-[var(--bg-surface)] border-[var(--primary)] shadow-[0_0_25px_rgba(214,83,72,0.2)] hover:shadow-[0_0_35px_rgba(214,83,72,0.3)]"
                                : "bg-[var(--bg-surface)] border-[var(--border)] hover:border-[var(--text-muted)] hover:shadow-lg"
                                }`}
                        >
                            {isRecommended && (
                                <div className="absolute -top-3 left-6 bg-[var(--primary)] text-white text-xs font-bold px-4 py-1.5 rounded-full flex items-center gap-1 shadow-lg">
                                    <MdCheckCircle className="text-sm" />
                                    РЕКОМЕНДУЕТСЯ
                                </div>
                            )}

                            <div className="flex items-center gap-6 flex-1">
                                <div
                                    className={`w-14 h-14 rounded-xl bg-gradient-to-br from-[var(--bg-main)] to-[var(--bg-surface)] border border-[var(--border)] flex items-center justify-center shadow-md group-hover:scale-105 transition-all ${item.color}`}
                                >
                                    {item.icon}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white group-hover:text-[var(--primary)] transition-colors">
                                        {item.name}
                                    </h3>
                                    <p className="text-sm text-[var(--text-muted)]">{item.sub}</p>
                                    <p className="text-xs text-[var(--text-muted)] mt-1">{item.size}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="text-xs text-[var(--text-muted)] hidden sm:block">v2.1.3</div>

                                <button
                                    className={
                                        isRecommended
                                            ? "group/btn bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-lg hover:shadow-xl flex items-center gap-2 shrink-0 border border-[var(--primary)]/60"
                                            : "group/btn bg-white text-black hover:bg-gray-100 px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-lg hover:shadow-xl flex items-center gap-2 shrink-0 border border-gray-200 hover:border-gray-300"
                                    }
                                    onClick={(e) => {
                                        e.preventDefault();
                                        window.location.href = getDownloadLink(item.id);
                                    }}
                                >
                                    <MdDownload className="text-lg group-hover/btn:-translate-x-0.5 transition-transform" />
                                    Скачать
                                </button>
                            </div>
                        </Link>
                    );
                })}
            </div>

            {/* Requirements */}
            <div className="max-w-3xl w-full p-8 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-xl mb-12">
                <div className="flex items-start gap-4 mb-6">
                    <div className="p-3 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/30 text-[var(--primary)] shrink-0 mt-0.5">
                        <MdInfo className="text-2xl" />
                    </div>
                    <div>
                        <h4 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                            Системные требования
                        </h4>
                        <div className="grid md:grid-cols-2 gap-4 text-sm">
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-[var(--bg-main)]/50 border border-[var(--border)]/50">
                                <div className="w-2 h-2 rounded-full bg-[var(--accent)] mt-2 flex-shrink-0"></div>
                                <span>Минимум 1GB оперативной памяти</span>
                            </div>
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-[var(--bg-main)]/50 border border-[var(--border)]/50">
                                <div className="w-2 h-2 rounded-full bg-[var(--accent)] mt-2 flex-shrink-0"></div>
                                <span>Доступ к буферу обмена</span>
                            </div>
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-[var(--bg-main)]/50 border border-[var(--border)]/50">
                                <div className="w-2 h-2 rounded-full bg-[var(--accent)] mt-2 flex-shrink-0"></div>
                                <span>Интернет только для активации и продления лицензии</span>
                            </div>
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-[var(--bg-main)]/50 border border-[var(--border)]/50">
                                <div className="w-2 h-2 rounded-full bg-[var(--accent)] mt-2 flex-shrink-0"></div>
                                <span>Совместимо с Google Docs, Word Online</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Support */}
            <div className="text-center space-y-4">
                <p className="text-lg text-[var(--text-muted)]">Проблемы с установкой?</p>
                <Link
                    href="https://t.me/"
                    className="inline-flex items-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-medium px-8 py-4 rounded-xl text-lg shadow-lg hover:shadow-xl transition-all"
                >
                    <MdPerson className="text-xl" />
                    Написать в поддержку
                </Link>
            </div>
        </div>
    );
}
