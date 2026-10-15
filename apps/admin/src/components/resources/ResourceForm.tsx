"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FIELD_LIMITS, type ResourceCategoryDto, type ResourceDto } from "@rrms/shared";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { ErrorMessage } from "@rrms/web/components/shared/ErrorMessage";
import { Button } from "@rrms/web/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@rrms/web/components/ui/field";
import { Input } from "@rrms/web/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@rrms/web/components/ui/select";
import { Switch } from "@rrms/web/components/ui/switch";
import { Textarea } from "@rrms/web/components/ui/textarea";
import { resourcesApi } from "@rrms/web/features/resources/api";
import {
  emptyResourceForm,
  resourceFormSchema,
  resourceToFormValues,
  toResourceRequest,
  type ResourceFormValues,
} from "@rrms/web/features/resources/resource-form-schema";
import { ApiClientError, getErrorMessage } from "@rrms/web/lib/api-client";

interface ResourceFormProps {
  categories: ResourceCategoryDto[];
  /** When provided the form edits this resource, otherwise it creates a new one. */
  resource?: ResourceDto;
}

const FORM_FIELDS = new Set<keyof ResourceFormValues>(["name", "categoryId", "description", "location", "capacity", "isActive"]);

export function ResourceForm({ categories, resource }: ResourceFormProps) {
  const router = useRouter();
  const isEdit = Boolean(resource);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<ResourceFormValues>({
    resolver: zodResolver(resourceFormSchema),
    defaultValues: resource ? resourceToFormValues(resource) : emptyResourceForm,
    mode: "onTouched",
  });
  const { register, control, handleSubmit, setError, formState } = form;
  const { errors, isSubmitting } = formState;

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const request = toResourceRequest(values);
      const { data } = resource
        ? await resourcesApi.update(resource.id, request)
        : await resourcesApi.create(request);
      toast.success(isEdit ? "Resource updated" : "Resource created", { description: data.name });
      router.push(`/resources/${data.id}`);
      router.refresh();
    } catch (error) {
      // Show server-side validation errors next to the matching fields.
      if (error instanceof ApiClientError) {
        if (error.code === "RESOURCE_NAME_TAKEN") {
          setError("name", { message: error.message }, { shouldFocus: true });
          return;
        }
        let mapped = false;
        for (const detail of error.details) {
          if (FORM_FIELDS.has(detail.path as keyof ResourceFormValues)) {
            setError(detail.path as keyof ResourceFormValues, { message: detail.message });
            mapped = true;
          }
        }
        if (mapped) return;
      }
      setFormError(getErrorMessage(error));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-2xl space-y-6 rounded-lg border bg-background p-4 sm:p-6">
      {formError && <ErrorMessage title={isEdit ? "Could not save changes" : "Could not create resource"} message={formError} />}

      <FieldGroup>
        <Field data-invalid={Boolean(errors.name)}>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input
            id="name"
            placeholder="e.g. Board Room"
            maxLength={FIELD_LIMITS.resourceName.max}
            aria-invalid={Boolean(errors.name)}
            {...register("name")}
          />
          <FieldError errors={[errors.name]} />
        </Field>

        <Field data-invalid={Boolean(errors.categoryId)}>
          <FieldLabel htmlFor="categoryId">Category</FieldLabel>
          <Controller
            control={control}
            name="categoryId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  id="categoryId"
                  className="w-full"
                  aria-invalid={Boolean(errors.categoryId)}
                  onBlur={field.onBlur}
                  ref={field.ref}
                >
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError errors={[errors.categoryId]} />
        </Field>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field data-invalid={Boolean(errors.location)}>
            <FieldLabel htmlFor="location">Location</FieldLabel>
            <Input
              id="location"
              placeholder="e.g. Level 5, East Wing"
              maxLength={FIELD_LIMITS.resourceLocation.max}
              aria-invalid={Boolean(errors.location)}
              {...register("location")}
            />
            <FieldError errors={[errors.location]} />
          </Field>

          <Field data-invalid={Boolean(errors.capacity)}>
            <FieldLabel htmlFor="capacity">Capacity</FieldLabel>
            <Input
              id="capacity"
              inputMode="numeric"
              placeholder="e.g. 8"
              aria-invalid={Boolean(errors.capacity)}
              aria-describedby="capacity-help"
              {...register("capacity")}
            />
            <FieldDescription id="capacity-help">Number of people. Leave empty if not applicable.</FieldDescription>
            <FieldError errors={[errors.capacity]} />
          </Field>
        </div>

        <Field data-invalid={Boolean(errors.description)}>
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <Textarea
            id="description"
            rows={4}
            placeholder="Equipment, access notes or anything bookers should know"
            maxLength={FIELD_LIMITS.resourceDescription.max}
            aria-invalid={Boolean(errors.description)}
            {...register("description")}
          />
          <FieldError errors={[errors.description]} />
        </Field>

        <Controller
          control={control}
          name="isActive"
          render={({ field }) => (
            <Field orientation="horizontal" className="rounded-md border p-3">
              <div className="flex-1 space-y-0.5">
                <FieldLabel htmlFor="isActive">Active</FieldLabel>
                <FieldDescription>Only active resources can be reserved.</FieldDescription>
              </div>
              <Switch id="isActive" checked={field.value} onCheckedChange={field.onChange} />
            </Field>
          )}
        />
      </FieldGroup>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" asChild>
          <Link href={resource ? `/resources/${resource.id}` : "/resources"}>Cancel</Link>
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
          {isEdit ? "Save changes" : "Create resource"}
        </Button>
      </div>
    </form>
  );
}
