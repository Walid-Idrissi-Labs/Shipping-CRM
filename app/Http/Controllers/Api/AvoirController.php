<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Avoir;
use App\Models\Facture;
use App\Services\FiscalCalculator;
use App\Traits\AppliesSorting;
use App\Traits\GeneratesNumbers;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AvoirController extends Controller
{
    use AppliesSorting;
    use GeneratesNumbers;

    public function index(Request $request)
    {
        $query = Avoir::query()->with(['client', 'facture']);

        $user = $request->user();
        if ($user->role === 'client') {
            $query->where('client_id', $user->client->id);
        } else {
            $query->where('provider_id', $user->provider->id);
        }

        $this->applySort(
            $query,
            $request,
            ['numero_n', 'created_at', 'taxable', 'ttc'],
            'created_at',
            'desc'
        );

        return response()->json($query->paginate(25));
    }

    public function store(Request $request)
    {
        $validated = $request->validate($this->rules());

        $provider = $request->user()->provider;

        $facture = Facture::where('id', $validated['facture_id'])
            ->where('provider_id', $provider->id)
            ->firstOrFail();

        if ($facture->avoir()->exists()) {
            return response()->json(['message' => 'Un avoir existe deja pour cette facture.'], 409);
        }

        if ($validated['type_destination'] !== $facture->type_destination) {
            return response()->json(['message' => 'Le type de l\'avoir doit correspondre au type de la facture.'], 422);
        }

        [$tauxTva, $nonTaxable, $taxable, $tva, $ttc] = FiscalCalculator::computeNegative(
            $validated['type_destination'],
            (float) $validated['taxable'],
            (float) ($validated['non_taxable'] ?? 0)
        );

        $seq = $this->nextAvoirSequence();

        $avoir = DB::transaction(function () use ($facture, $provider, $validated, $seq, $tauxTva, $nonTaxable, $taxable, $tva, $ttc) {
            return Avoir::create([
                'provider_id' => $provider->id,
                'client_id' => $facture->client_id,
                'facture_id' => $facture->id,
                'numero_n' => $seq['sequence'],
                'annee' => $seq['year'],
                'type_destination' => $validated['type_destination'],
                'taux_tva' => $tauxTva,
                'non_taxable' => $nonTaxable,
                'taxable' => $taxable,
                'tva' => $tva,
                'ttc' => $ttc,
            ]);
        });

        return response()->json([
            'message' => 'Avoir cree.',
            'avoir' => $avoir->load(['client', 'facture']),
        ], 201);
    }

    public function show(Request $request, Avoir $avoir)
    {
        $this->authorizeAccess($request, $avoir);

        return response()->json($avoir->load(['client', 'facture.expeditions']));
    }

    public function pdf(Request $request, Avoir $avoir)
    {
        $this->authorizeAccess($request, $avoir);
        $avoir->load(['client', 'facture.expeditions', 'provider']);

        $pdf = Pdf::loadView('pdfs.avoir', ['avoir' => $avoir])
            ->setPaper('a4', 'portrait');

        $safeNumero = str_replace(['/', '\\'], '-', $avoir->numero);
        $filename = "avoir-{$safeNumero}.pdf";

        return $pdf->download($filename);
    }

    public function destroy(Request $request, Avoir $avoir)
    {
        $this->authorizeAccess($request, $avoir);

        $avoir->delete();

        return response()->json(['message' => 'Avoir supprime.']);
    }

    private function authorizeAccess(Request $request, Avoir $avoir): void
    {
        $user = $request->user();
        if ($user->role === 'prestataire') {
            if ($avoir->provider_id !== $user->provider->id) {
                abort(403, 'Acces refuse.');
            }
        } elseif ($user->role === 'client') {
            if ((int) $avoir->client_id !== (int) $user->client->id) {
                abort(403, 'Acces refuse.');
            }
        } else {
            abort(403, 'Acces refuse.');
        }
    }

    private function rules(): array
    {
        return [
            'facture_id' => ['required', 'integer', 'exists:factures,id'],
            'type_destination' => ['required', 'in:national,international'],
            'non_taxable' => ['nullable', 'numeric', 'min:0'],
            'taxable' => ['required', 'numeric', 'min:0'],
        ];
    }
}