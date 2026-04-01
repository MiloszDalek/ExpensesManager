import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { AlertCircle, ArrowLeft, Compass, Home, LayoutDashboard } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { createPageUrl } from "@/utils/url";

export default function NotFoundPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();

    const primaryActionPath = user ? createPageUrl("Dashboard") : "/home";
    const primaryActionLabel = user ? t("notFoundPage.goToDashboard") : t("notFoundPage.goHome");

    return (
        <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden px-4 py-10 md:py-16">
            <div className="pointer-events-none absolute inset-0 -z-10">
                <div className="absolute -left-20 top-8 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
                <div className="absolute -right-16 bottom-6 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="mx-auto max-w-3xl"
            >
                <Card className="border-border/70 bg-card/85 shadow-xl backdrop-blur-sm">
                    <CardContent className="space-y-6 p-6 md:p-10">
                        <div className="flex items-center justify-between gap-4">
                            <Badge variant="outline" className="px-3 py-1 text-sm font-semibold">
                                404
                            </Badge>
                            <Compass className="h-6 w-6 text-primary" />
                        </div>

                        <div className="space-y-3">
                            <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
                                {t("notFoundPage.title")}
                            </h1>
                            <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
                                {t("notFoundPage.subtitle")}
                            </p>
                        </div>

                        <div className="rounded-lg border border-dashed border-border bg-muted/40 p-4">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="mt-0.5 h-4 w-4 text-muted-foreground" />
                                <div>
                                    <p className="text-sm font-medium text-foreground">{t("notFoundPage.requestedPath")}</p>
                                    <p className="mt-1 break-all text-sm text-muted-foreground">{location.pathname}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <Button onClick={() => navigate(-1)} variant="outline" className="sm:min-w-40">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                {t("notFoundPage.goBack")}
                            </Button>

                            <Link to={primaryActionPath} className="sm:min-w-40">
                                <Button className="w-full">
                                    {user ? <LayoutDashboard className="mr-2 h-4 w-4" /> : <Home className="mr-2 h-4 w-4" />}
                                    {primaryActionLabel}
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}