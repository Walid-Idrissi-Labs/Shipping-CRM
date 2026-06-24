<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Affectation;
use App\Models\Chauffeur;
use App\Models\Facture;
use App\Models\QuoteRequest;
use App\Models\Shipment;
use App\Models\Vehicule;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function provider(Request $request)
    {
        $providerId = $request->user()->provider->id;

        $shipmentBase = fn () => Shipment::where('provider_id', $providerId);

        $shipmentsByStatus = $shipmentBase()
            ->where('created_at', '>=', now()->subDays(30))
            ->select('statut_actuel', DB::raw('count(*) as total'))
            ->groupBy('statut_actuel')
            ->pluck('total', 'statut_actuel')
            ->all();

        $shipmentsByService = $shipmentBase()
            ->where('created_at', '>=', now()->subDays(30))
            ->select('type_service', DB::raw('count(*) as total'))
            ->groupBy('type_service')
            ->pluck('total', 'type_service')
            ->all();

        $shipmentsThisMonth = $shipmentBase()
            ->whereBetween('created_at', [now()->startOfMonth(), now()->endOfMonth()])
            ->count();

        $shipmentsLastMonth = $shipmentBase()
            ->whereBetween('created_at', [
                now()->subMonth()->startOfMonth(),
                now()->subMonth()->endOfMonth(),
            ])
            ->count();

        $revenueThisMonth = Facture::where('provider_id', $providerId)
            ->whereBetween('date_facture', [now()->startOfMonth(), now()->endOfMonth()])
            ->sum('ttc');

        $revenueLastMonth = Facture::where('provider_id', $providerId)
            ->whereBetween('date_facture', [
                now()->subMonth()->startOfMonth(),
                now()->subMonth()->endOfMonth(),
            ])
            ->sum('ttc');

        $unpaidInvoicesTotal = Facture::where('provider_id', $providerId)
            ->where('statut', 'impayee')
            ->sum('ttc');

        $todayMissionsCount = Affectation::where('provider_id', $providerId)
            ->whereDate('date_heure_depart', today())
            ->whereIn('statut', ['planifiee', 'en_cours'])
            ->count();

        $unassignedCount = $shipmentBase()
            ->whereNotIn('id', function ($query) use ($providerId) {
                $query->select('affectation_expeditions.expedition_id')
                    ->from('affectation_expeditions')
                    ->join('affectations', 'affectations.id', '=', 'affectation_expeditions.affectation_id')
                    ->where('affectations.provider_id', $providerId)
                    ->whereIn('affectations.statut', ['planifiee', 'en_cours']);
            })
            ->count();

        $vehicules = Vehicule::where('provider_id', $providerId)->get();
        $chauffeurs = Chauffeur::where('provider_id', $providerId)->get();

        $fleetSummary = [
            'available_vehicles' => $vehicules->where('statut', 'disponible')->count(),
            'mission_vehicles' => $vehicules->where('statut', 'en_mission')->count(),
            'maintenance_vehicles' => $vehicules->where('statut', 'en_maintenance')->count(),
            'hors_service_vehicles' => $vehicules->where('statut', 'hors_service')->count(),
            'available_drivers' => $chauffeurs->where('statut', 'actif')->count(),
            'mission_drivers' => $chauffeurs->where('statut', 'en_mission')->count(),
            'leave_drivers' => $chauffeurs->where('statut', 'en_conge')->count(),
        ];

        $documentAlerts = [];
        foreach ($vehicules as $v) {
            foreach ($v->documentAlerts() as $alert) {
                $severity = $alert['status'] === 'expired' ? 'danger' : 'warning';
                $documentAlerts[] = $alert + [
                    'severity' => $severity,
                    'label' => match ($alert['type']) {
                        'controle_technique' => 'Controle technique',
                        'assurance' => 'Assurance',
                        'carte_grise' => 'Carte grise',
                        default => $alert['type'],
                    },
                    'vehicule' => [
                        'id' => $v->id,
                        'immatriculation' => $v->immatriculation,
                        'marque_modele' => $v->marque_modele,
                    ],
                ];
            }
        }

        return response()->json([
            'total_shipments' => $shipmentBase()->count(),
            'total_clients' => $request->user()->provider->clients()->count(),
            'pending_quotes' => QuoteRequest::where('provider_id', $providerId)
                ->where('statut', 'en_attente')
                ->count(),
            'unpaid_invoices' => Facture::where('provider_id', $providerId)
                ->where('statut', 'impayee')
                ->count(),

            'shipments_by_status' => $shipmentsByStatus,
            'shipments_by_service' => $shipmentsByService,
            'shipments_this_month' => $shipmentsThisMonth,
            'shipments_last_month' => $shipmentsLastMonth,

            'unassigned_count' => $unassignedCount,
            'missions_today' => $todayMissionsCount,

            'revenue_this_month' => (float) $revenueThisMonth,
            'revenue_last_month' => (float) $revenueLastMonth,
            'unpaid_invoices_total' => (float) $unpaidInvoicesTotal,

            'fleet_summary' => $fleetSummary,
            'document_alerts' => $documentAlerts,
        ]);
    }

    public function client(Request $request)
    {
        $client = $request->user()->client;

        return response()->json([
            'total_shipments' => $client->shipments()->count(),
            'total_invoices' => $client->factures()->count(),
            'unpaid_total' => $client->factures()->where('statut', 'impayee')->sum('ttc'),
            'paid_total' => $client->factures()->where('statut', 'payee')->sum('ttc'),
            'recent_shipments' => $client->shipments()->orderByDesc('created_at')->limit(5)->get(),
            'recent_invoices' => $client->factures()->orderByDesc('date_facture')->limit(5)->get(),
        ]);
    }

    public function fleet(Request $request)
    {
        $providerId = $request->user()->provider->id;

        $vehicules = Vehicule::where('provider_id', $providerId)->get();
        $chauffeurs = Chauffeur::with('typesVehicules')->where('provider_id', $providerId)->get();

        $vehiclesByStatus = $vehicules->groupBy('statut')->map->count();
        $driversByStatus = $chauffeurs->groupBy('statut')->map->count();

        $documentAlerts = [];
        foreach ($vehicules as $v) {
            foreach ($v->documentAlerts() as $alert) {
                $documentAlerts[] = $alert + [
                    'vehicule' => [
                        'id' => $v->id,
                        'immatriculation' => $v->immatriculation,
                        'marque_modele' => $v->marque_modele,
                    ],
                ];
            }
        }

        $todayMissions = Affectation::with(['chauffeur', 'vehicule', 'expeditions'])
            ->where('provider_id', $providerId)
            ->whereDate('date_heure_depart', today())
            ->whereIn('statut', ['planifiee', 'en_cours'])
            ->orderBy('date_heure_depart')
            ->get();

        $unassignedCount = Shipment::where('provider_id', $providerId)
            ->whereNotIn('id', function ($query) use ($providerId) {
                $query->select('affectation_expeditions.expedition_id')
                    ->from('affectation_expeditions')
                    ->join('affectations', 'affectations.id', '=', 'affectation_expeditions.affectation_id')
                    ->where('affectations.provider_id', $providerId)
                    ->whereIn('affectations.statut', ['planifiee', 'en_cours']);
            })
            ->count();

        return response()->json([
            'vehicles' => $vehicules->map(fn($v) => [
                'id' => $v->id,
                'immatriculation' => $v->immatriculation,
                'marque_modele' => $v->marque_modele,
                'statut' => $v->statut,
            ]),
            'drivers' => $chauffeurs->map(fn($c) => [
                'id' => $c->id,
                'nom_complet' => $c->nom_complet,
                'statut' => $c->statut,
            ]),
            'vehicles_by_status' => [
                'disponible' => $vehiclesByStatus['disponible'] ?? 0,
                'en_mission' => $vehiclesByStatus['en_mission'] ?? 0,
                'en_maintenance' => $vehiclesByStatus['en_maintenance'] ?? 0,
                'hors_service' => $vehiclesByStatus['hors_service'] ?? 0,
            ],
            'drivers_by_status' => [
                'actif' => $driversByStatus['actif'] ?? 0,
                'en_mission' => $driversByStatus['en_mission'] ?? 0,
                'en_conge' => $driversByStatus['en_conge'] ?? 0,
            ],
            'document_alerts' => $documentAlerts,
            'today_missions' => $todayMissions,
            'unassigned_shipments_count' => $unassignedCount,
        ]);
    }
}
